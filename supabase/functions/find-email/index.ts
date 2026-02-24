import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = "https://api.github.com";

function isRealEmail(email: string | null | undefined): email is string {
  if (!email || email.length < 5) return false;
  const lower = email.toLowerCase();
  if (lower.includes("noreply") || lower === "none" || lower.endsWith("@github.com")) return false;
  return lower.includes("@");
}

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "email-finder-bot",
  };
  const authToken = token || Deno.env.get("GITHUB_PAT");
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

async function tryPatchEmail(repoFullName: string, login: string, headers: Record<string, string>): Promise<string | null> {
  try {
    // Try both author and committer params
    for (const param of ["author", "committer"]) {
      const commitsRes = await fetch(
        `${GITHUB_API}/repos/${repoFullName}/commits?${param}=${encodeURIComponent(login)}&per_page=30`,
        { headers }
      );
      if (!commitsRes.ok) {
        console.log(`Commits API (${param}) failed for ${login} in ${repoFullName}: ${commitsRes.status}`);
        continue;
      }
      const commits = await commitsRes.json();
      if (!Array.isArray(commits) || commits.length === 0) {
        console.log(`No commits (${param}) for ${login} in ${repoFullName}`);
        continue;
      }

      console.log(`Found ${commits.length} commits (${param}) for ${login} in ${repoFullName}`);

      for (const commit of commits) {
        // Check commit API email (author + committer)
        const authorEmail = commit?.commit?.author?.email;
        if (isRealEmail(authorEmail)) {
          console.log(`Found email via commit API author: ${authorEmail}`);
          return authorEmail;
        }
        const committerEmail = commit?.commit?.committer?.email;
        if (isRealEmail(committerEmail)) {
          console.log(`Found email via commit API committer: ${committerEmail}`);
          return committerEmail;
        }

        // Try .patch file
        try {
          const patchUrl = `https://github.com/${repoFullName}/commit/${commit.sha}.patch`;
          const patchRes = await fetch(patchUrl, {
            headers: { "User-Agent": "email-finder-bot" },
            redirect: "follow",
          });
          if (patchRes.ok) {
            const patchText = await patchRes.text();
            // Match all email patterns in From: and Author: lines
            const fromMatch = patchText.match(/^From:.*<([^>]+)>/m);
            if (fromMatch && isRealEmail(fromMatch[1])) {
              console.log(`Found email via .patch From: ${fromMatch[1]}`);
              return fromMatch[1];
            }
            // Also check for email in the diff headers
            const authorMatch = patchText.match(/^author\s+.*<([^>]+)>/m);
            if (authorMatch && isRealEmail(authorMatch[1])) {
              console.log(`Found email via .patch author: ${authorMatch[1]}`);
              return authorMatch[1];
            }
          } else {
            console.log(`Patch fetch failed for ${commit.sha}: ${patchRes.status}`);
          }
        } catch (e) {
          console.log(`Patch error: ${e}`);
        }
      }
    }
  } catch (e) {
    console.log(`tryPatchEmail error: ${e}`);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { login, token, repo } = await req.json();

    if (!login || typeof login !== "string") {
      return new Response(JSON.stringify({ error: "Missing login" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = getHeaders(token);
    console.log(`Finding email for ${login}, repo: ${repo || "none"}`);

    // Strategy 1: Check user profile
    try {
      const profileRes = await fetch(`${GITHUB_API}/users/${encodeURIComponent(login)}`, { headers });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (isRealEmail(profile.email)) {
          console.log(`Found email via profile: ${profile.email}`);
          return new Response(JSON.stringify({ email: profile.email }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch { /* continue */ }

    // Strategy 2: Search the contributed repo
    if (repo) {
      const email = await tryPatchEmail(repo, login, headers);
      if (email) {
        return new Response(JSON.stringify({ email }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Strategy 3: GitHub commit search API (searches across all repos)
    try {
      const searchRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${encodeURIComponent(login)}&sort=author-date&order=asc&per_page=20`,
        { headers: { ...headers, Accept: "application/vnd.github.cloak-preview+json" } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.items && Array.isArray(searchData.items)) {
          console.log(`Commit search returned ${searchData.items.length} results for ${login}`);
          for (const item of searchData.items) {
            const authorEmail = item?.commit?.author?.email;
            if (isRealEmail(authorEmail)) {
              console.log(`Found email via commit search: ${authorEmail}`);
              return new Response(JSON.stringify({ email: authorEmail }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            const committerEmail = item?.commit?.committer?.email;
            if (isRealEmail(committerEmail)) {
              console.log(`Found email via commit search committer: ${committerEmail}`);
              return new Response(JSON.stringify({ email: committerEmail }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      }
    } catch { /* continue */ }

    // Strategy 4: Events API
    try {
      const eventsRes = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(login)}/events/public?per_page=100`,
        { headers }
      );
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        if (Array.isArray(events)) {
          for (const event of events) {
            if (event.type === "PushEvent" && event.payload?.commits) {
              for (const c of event.payload.commits) {
                if (isRealEmail(c.author?.email)) {
                  console.log(`Found email via events: ${c.author.email}`);
                  return new Response(JSON.stringify({ email: c.author.email }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                  });
                }
              }
            }
          }
        }
      }
    } catch { /* continue */ }

    // Strategy 5: User's own repos
    try {
      const reposRes = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=10`,
        { headers }
      );
      if (reposRes.ok) {
        const repos = await reposRes.json();
        if (Array.isArray(repos)) {
          for (const r of repos) {
            if (r.fork) continue; // skip forks, check owned repos first
            const email = await tryPatchEmail(r.full_name, login, headers);
            if (email) {
              return new Response(JSON.stringify({ email }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
          // Try forked repos too
          for (const r of repos) {
            if (!r.fork) continue;
            const email = await tryPatchEmail(r.full_name, login, headers);
            if (email) {
              return new Response(JSON.stringify({ email }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      }
    } catch { /* continue */ }

    console.log(`No email found for ${login}`);
    return new Response(JSON.stringify({ email: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});