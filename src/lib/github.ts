import { GitHubRepo, GitHubContributor } from "@/types/github";

const GITHUB_API = "https://api.github.com";

// Rate limit tracking
let rateLimitRemaining: number | null = null;
let rateLimitLimit: number | null = null;
let rateLimitReset: number | null = null;
const SAFETY_PERCENT = 0.10; // Keep 10% of quota in reserve
const MIN_SAFE_REMAINING = 5; // Absolute minimum before stopping
const THROTTLE_MS = 200; // Small delay between paginated calls

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

export async function enrichContributors(
  contributors: GitHubContributor[],
  token?: string,
  onProgress?: (enriched: number, total: number, partialResults?: GitHubContributor[]) => void
): Promise<GitHubContributor[]> {
  const enriched: GitHubContributor[] = [];
  const toEnrich = contributors.filter((c) => !c.isAnonymous && c.login !== "anonymous");
  const alreadyAnon = contributors.filter((c) => c.isAnonymous || c.login === "anonymous");

  for (let i = 0; i < toEnrich.length; i++) {
    const c = toEnrich[i];

    // Rate limit guard
    if (rateLimitRemaining !== null && rateLimitRemaining <= getSafetyBuffer()) {
      console.warn(`Rate limit guard during enrichment at ${i}/${toEnrich.length}. Returning partial.`);
      const remaining = toEnrich.slice(i).map((r) => ({ ...r, enriched: false }));
      enriched.push(...remaining);
      onProgress?.(i, toEnrich.length, [...enriched]);
      break;
    }

    try {
      const res = await fetchWithRateLimit(`${GITHUB_API}/users/${c.login}`, token);
      const profile = await res.json();
      enriched.push({
        ...c,
        name: profile.name || null,
        bio: profile.bio || null,
        company: profile.company || null,
        blog: profile.blog || null,
        twitter_username: profile.twitter_username || null,
        location: profile.location || null,
        enriched: true,
      });
    } catch {
      enriched.push({ ...c, enriched: false });
    }

    onProgress?.(i + 1, toEnrich.length, [...enriched, ...toEnrich.slice(i + 1)]);
    if (i < toEnrich.length - 1) {
      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }
  }

  return [...enriched, ...alreadyAnon.map((c) => ({ ...c, enriched: false }))];
}

export function contributorsToCsv(contributors: GitHubContributor[], repoName: string): string {
  const header = "Repository,Username,Full Name,Profile URL,Contributions,Type,Company,Twitter,Blog,Location,Bio\n";
  const rows = contributors
    .map(
      (c) =>
        `"${repoName}","${c.login}","${c.name || ""}","${c.html_url}",${c.contributions},"${c.isAnonymous ? "Anonymous" : "User"}","${c.company || ""}","${c.twitter_username ? `https://twitter.com/${c.twitter_username}` : ""}","${c.blog || ""}","${c.location || ""}","${(c.bio || "").replace(/"/g, '""')}"`
    )
    .join("\n");
  return header + rows;
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
