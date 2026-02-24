import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = "https://api.github.com";

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
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
    if (!commitsRes.ok) return null;
    const commits = await commitsRes.json();
    if (!Array.isArray(commits) || commits.length === 0) return null;

    for (const commit of commits) {
      // Try .patch method first (server-side, no CORS)
      try {
        const patchRes = await fetch(
          `https://github.com/${repoFullName}/commit/${commit.sha}.patch`
        );
        if (patchRes.ok) {
          const patchText = await patchRes.text();
          const match = patchText.match(/^From:.*<([^>]+)>/m);
          if (match && match[1] && !match[1].includes("noreply.github.com")) {
            return match[1];
          }
        }
      } catch { /* continue */ }

      // Fallback: commit API email
      const apiEmail = commit?.commit?.author?.email;
      if (apiEmail && !apiEmail.includes("noreply.github.com")) {
        return apiEmail;
      }
    }
  } catch { /* continue */ }
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

    // Strategy 1: Search the repo they contributed to (most reliable)
    if (repo) {
      const email = await tryPatchEmail(repo, login, headers);
      if (email) {
        return new Response(JSON.stringify({ email }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Strategy 2: Use GitHub Events API (public events often contain emails)
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
                if (c.author?.email && !c.author.email.includes("noreply.github.com")) {
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

    // Strategy 3: Search the user's own repos
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
