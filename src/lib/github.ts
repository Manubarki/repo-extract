import { GitHubRepo, GitHubContributor } from "@/types/github";

const GITHUB_API = "https://api.github.com";

// Rate limit tracking
let rateLimitRemaining: number | null = null;
let rateLimitReset: number | null = null;
const SAFETY_BUFFER = 50; // Stop before hitting 0 — keep 50 requests in reserve
const THROTTLE_MS = 200; // Small delay between paginated calls

export function getRateLimitInfo() {
  return { remaining: rateLimitRemaining, resetAt: rateLimitReset };
}

function updateRateLimitFromHeaders(res: Response) {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining != null) rateLimitRemaining = parseInt(remaining);
  if (reset != null) rateLimitReset = parseInt(reset) * 1000;
}

async function fetchWithRateLimit(url: string, token?: string): Promise<Response> {
  // Pre-check: refuse to call if we know we're near the limit
  if (rateLimitRemaining !== null && rateLimitRemaining <= SAFETY_BUFFER) {
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
    if (rateLimitRemaining !== null && rateLimitRemaining <= SAFETY_BUFFER) {
      console.warn(`Rate limit guard triggered at page ${page}. Returning partial results.`);
      break;
    }

    const res = await fetchWithRateLimit(
      `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=${perPage}&page=${page}&anon=true`,
      token
    );
    const data: GitHubContributor[] = await res.json();

    if (!Array.isArray(data) || data.length === 0) break;

    const filtered = data
      .filter((c) => !c.login?.includes("[bot]") && c.type !== "Bot")
      .map((c) => ({
        ...c,
        isAnonymous: !c.login || c.type === "Anonymous",
        login: c.login || "anonymous",
        avatar_url: c.avatar_url || "",
        html_url: c.html_url || "",
      }));

    allContributors.push(...filtered);
    onProgress?.(allContributors.length, rateLimitRemaining);

    if (data.length < perPage) break;
    page++;

    // Throttle to avoid burst usage
    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  return allContributors;
}

export function contributorsToCsv(contributors: GitHubContributor[], repoName: string): string {
  const header = "Repository,Username,Profile URL,Contributions,Type\n";
  const rows = contributors
    .map(
      (c) =>
        `"${repoName}","${c.login}","${c.html_url}",${c.contributions},"${c.isAnonymous ? "Anonymous" : "User"}"`
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
