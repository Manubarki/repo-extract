import { GitHubRepo, GitHubContributor } from "@/types/github";

const GITHUB_API = "https://api.github.com";

async function fetchWithRateLimit(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });

  if (res.status === 403) {
    const resetHeader = res.headers.get("x-ratelimit-reset");
    if (resetHeader) {
      const resetTime = parseInt(resetHeader) * 1000;
      const waitMs = Math.max(resetTime - Date.now(), 1000);
      if (waitMs < 60000) {
        await new Promise((r) => setTimeout(r, waitMs));
        return fetchWithRateLimit(url, token);
      }
    }
    throw new Error("Rate limited by GitHub. Add a token or wait a moment.");
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res;
}

export async function searchRepos(query: string, token?: string): Promise<GitHubRepo[]> {
  const res = await fetchWithRateLimit(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`,
    token
  );
  const data = await res.json();
  return data.items || [];
}

export async function getContributors(
  owner: string,
  repo: string,
  token?: string,
  onProgress?: (current: number) => void
): Promise<GitHubContributor[]> {
  const allContributors: GitHubContributor[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
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
    onProgress?.(allContributors.length);

    if (data.length < perPage) break;
    page++;
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
