import { GitHubRepo, GitHubContributor } from "@/types/github";

const GITHUB_API = "https://api.github.com";

// Rate limit tracking
let rateLimitRemaining: number | null = null;
let rateLimitLimit: number | null = null;
let rateLimitReset: number | null = null;
let lastToken: string | undefined = undefined;
const SAFETY_PERCENT = 0.10;
const MIN_SAFE_REMAINING = 5;
const THROTTLE_MS = 200;

/** Reset cached rate limit when token changes (different quota pool) */
export function resetRateLimitIfTokenChanged(token?: string) {
  if (token !== lastToken) {
    rateLimitRemaining = null;
    rateLimitLimit = null;
    rateLimitReset = null;
    lastToken = token;
  }
}

function getSafetyBuffer(): number {
  if (rateLimitLimit !== null) {
    return Math.max(Math.floor(rateLimitLimit * SAFETY_PERCENT), MIN_SAFE_REMAINING);
  }
  return MIN_SAFE_REMAINING;
}

export function getRateLimitInfo() {
  return { remaining: rateLimitRemaining, resetAt: rateLimitReset };
}

function updateRateLimitFromHeaders(res: Response) {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const limit = res.headers.get("x-ratelimit-limit");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining != null) rateLimitRemaining = parseInt(remaining);
  if (limit != null) rateLimitLimit = parseInt(limit);
  if (reset != null) rateLimitReset = parseInt(reset) * 1000;
}

async function fetchWithRateLimit(url: string, token?: string): Promise<Response> {
  // Pre-check: refuse to call if we know we're near the limit
  if (rateLimitRemaining !== null && rateLimitRemaining <= getSafetyBuffer()) {
    const resetIn = rateLimitReset ? Math.max(0, rateLimitReset - Date.now()) : 0;
    const resetMins = Math.ceil(resetIn / 60000);
    throw new Error(
      `Rate limit guard: only ${rateLimitRemaining} requests left. Resets in ~${resetMins} min. Stopping to protect your quota.`
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  updateRateLimitFromHeaders(res);

  if (res.status === 403 || res.status === 429) {
    const resetHeader = res.headers.get("x-ratelimit-reset");
    if (resetHeader) {
      const resetTime = parseInt(resetHeader) * 1000;
      const waitMs = Math.max(resetTime - Date.now(), 1000);
      const waitMins = Math.ceil(waitMs / 60000);
      throw new Error(
        `Rate limited by GitHub. Resets in ~${waitMins} min. Your data so far is preserved.`
      );
    }
    throw new Error("Rate limited by GitHub. Wait a moment and try again.");
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res;
}

export async function searchRepos(query: string, token?: string): Promise<GitHubRepo[]> {
  const res = await fetchWithRateLimit(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
    token
  );
  const data = await res.json();
  return data.items || [];
}

export async function getContributors(
  owner: string,
  repo: string,
  token?: string,
  onProgress?: (current: number, remaining: number | null) => void
): Promise<GitHubContributor[]> {
  const allContributors: GitHubContributor[] = [];
  let page = 1;
  const perPage = 100;
  const MAX_PAGES = 20; // Cap at 2000 contributors max to protect quota

  while (page <= MAX_PAGES) {
    // Pre-flight rate check
    if (rateLimitRemaining !== null && rateLimitRemaining <= getSafetyBuffer()) {
      console.warn(`Rate limit guard triggered at page ${page}. Returning partial results.`);
      break;
    }

    const res = await fetchWithRateLimit(
      `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=${perPage}&page=${page}`,
      token
    );
    const data: GitHubContributor[] = await res.json();

    if (!Array.isArray(data) || data.length === 0) break;

    const filtered = data.filter((c) => !c.login?.includes("[bot]") && c.type !== "Bot");

    allContributors.push(...filtered);
    onProgress?.(allContributors.length, rateLimitRemaining);

    if (data.length < perPage) break;
    page++;

    // Throttle to avoid burst usage
    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  return allContributors;
}

export interface EnrichControl {
  paused: boolean;
}

export async function enrichContributors(
  contributors: GitHubContributor[],
  token?: string,
  onProgress?: (enriched: number, total: number, partialResults?: GitHubContributor[]) => void,
  control?: EnrichControl
): Promise<GitHubContributor[]> {
  const enriched: GitHubContributor[] = [];
  const toEnrich = contributors.filter((c) => !c.isAnonymous && c.login !== "anonymous");
  const alreadyAnon = contributors.filter((c) => c.isAnonymous || c.login === "anonymous");
  const BATCH_SIZE = 5;

  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    // Wait while paused
    while (control?.paused) {
      await new Promise((r) => setTimeout(r, 200));
    }

    // Rate limit guard
    if (rateLimitRemaining !== null && rateLimitRemaining <= getSafetyBuffer()) {
      console.warn(`Rate limit guard during enrichment at ${i}/${toEnrich.length}. Returning partial.`);
      const remaining = toEnrich.slice(i).map((r) => ({ ...r, enriched: false }));
      enriched.push(...remaining);
      onProgress?.(i, toEnrich.length, [...enriched]);
      break;
    }

    const batch = toEnrich.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (c) => {
        try {
          const res = await fetchWithRateLimit(`${GITHUB_API}/users/${c.login}`, token);
          const profile = await res.json();
          return {
            ...c,
            name: profile.name || null,
            bio: profile.bio || null,
            company: profile.company || null,
            blog: profile.blog || null,
            twitter_username: profile.twitter_username || null,
            location: profile.location || null,
            enriched: true,
          };
        } catch {
          return { ...c, enriched: false };
        }
      })
    );

    for (const result of results) {
      enriched.push(result.status === "fulfilled" ? result.value : batch[results.indexOf(result)]);
    }

    const done = Math.min(i + BATCH_SIZE, toEnrich.length);
    onProgress?.(done, toEnrich.length, [...enriched, ...toEnrich.slice(done)]);

    if (done < toEnrich.length) {
      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }
  }

  return [...enriched, ...alreadyAnon.map((c) => ({ ...c, enriched: false }))];
}

export function contributorsToCsv(contributors: GitHubContributor[], repoName: string): string {
  const header = "Repository,Username,Full Name,Email,Profile URL,Contributions,Type,Company,Twitter,Blog,Location,Bio\n";
  const rows = contributors
    .map(
      (c) =>
        `"${repoName}","${c.login}","${c.name || ""}","${c.email || ""}","${c.html_url}",${c.contributions},"${c.isAnonymous ? "Anonymous" : "User"}","${c.company || ""}","${c.twitter_username ? `https://twitter.com/${c.twitter_username}` : ""}","${c.blog || ""}","${c.location || ""}","${(c.bio || "").replace(/"/g, '""')}"`
    )
    .join("\n");
  return header + rows;
}

export async function findContributorEmail(
  login: string,
  token?: string,
  repo?: string
): Promise<string | null> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/find-email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({ login, token, repo }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.email || null;
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
