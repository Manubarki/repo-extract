import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = "https://api.github.com";

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
    const commitsRes = await fetch(
      `${GITHUB_API}/repos/${repoFullName}/commits?author=${encodeURIComponent(login)}&per_page=5`,
      { headers }
    );
    if (!commitsRes.ok) {
      console.log(`Commits API failed for ${login} in ${repoFullName}: ${commitsRes.status}`);
      return null;
    }
    const commits = await commitsRes.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      console.log(`No commits found for ${login} in ${repoFullName}`);
      return null;
    }

    for (const commit of commits) {
      // Try commit API email first (most reliable from server)
      const apiEmail = commit?.commit?.author?.email;
      if (apiEmail && !apiEmail.includes("noreply.github.com") && !apiEmail.includes("users.noreply")) {
        console.log(`Found email via commit API: ${apiEmail}`);
        return apiEmail;
      }

      // Try .patch method (server-side, no CORS)
      try {
        const patchUrl = `https://github.com/${repoFullName}/commit/${commit.sha}.patch`;
        const patchRes = await fetch(patchUrl, {
          headers: { "User-Agent": "email-finder-bot" },
          redirect: "follow",
        });
        if (patchRes.ok) {
          const patchText = await patchRes.text();
          const match = patchText.match(/^From:.*<([^>]+)>/m);
          if (match && match[1] && !match[1].includes("noreply.github.com") && !match[1].includes("users.noreply")) {
            console.log(`Found email via .patch: ${match[1]}`);
            return match[1];
          }
        } else {
          console.log(`Patch fetch failed for ${commit.sha}: ${patchRes.status}`);
        }
      } catch (e) {
        console.log(`Patch fetch error: ${e}`);
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

    // Strategy 1: Check user profile for public email
    try {
      const profileRes = await fetch(`${GITHUB_API}/users/${encodeURIComponent(login)}`, { headers });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.email && !profile.email.includes("noreply.github.com")) {
          console.log(`Found email via profile: ${profile.email}`);
          return new Response(JSON.stringify({ email: profile.email }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch { /* continue */ }

    // Strategy 2: Search the repo they contributed to
    if (repo) {
      const email = await tryPatchEmail(repo, login, headers);
      if (email) {
        return new Response(JSON.stringify({ email }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Strategy 3: Use GitHub Events API
    try {
      const eventsRes = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(login)}/events/public?per_page=30`,
        { headers }
      );
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        if (Array.isArray(events)) {
          for (const event of events) {
            if (event.type === "PushEvent" && event.payload?.commits) {
              for (const c of event.payload.commits) {
                if (c.author?.email && !c.author.email.includes("noreply.github.com") && !c.author.email.includes("users.noreply")) {
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

    // Strategy 4: Search the user's own repos
    try {
      const reposRes = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=5`,
        { headers }
      );
      if (reposRes.ok) {
        const repos = await reposRes.json();
        if (Array.isArray(repos)) {
          for (const r of repos) {
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