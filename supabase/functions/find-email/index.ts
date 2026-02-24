import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = "https://api.github.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { login, token } = await req.json();

    if (!login || typeof login !== "string") {
      return new Response(JSON.stringify({ error: "Missing login" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    // Use user-provided token, or fall back to server-side PAT
    const authToken = token || Deno.env.get("GITHUB_PAT");
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    // 1. Get user's recent repos
    const reposRes = await fetch(
      `${GITHUB_API}/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=5`,
      { headers }
    );
    if (!reposRes.ok) {
      return new Response(JSON.stringify({ email: null, error: "Failed to fetch repos" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const repos = await reposRes.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      return new Response(JSON.stringify({ email: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. For each repo, get a commit by this user and fetch the .patch
    for (const repo of repos) {
      try {
        const commitsRes = await fetch(
          `${GITHUB_API}/repos/${repo.full_name}/commits?author=${encodeURIComponent(login)}&per_page=1`,
          { headers }
        );
        if (!commitsRes.ok) continue;
        const commits = await commitsRes.json();
        if (!Array.isArray(commits) || commits.length === 0) continue;

        const commitSha = commits[0].sha;

        // Fetch the .patch file (no CORS issue on server side)
        const patchRes = await fetch(
          `https://github.com/${repo.full_name}/commit/${commitSha}.patch`
        );
        if (!patchRes.ok) continue;
        const patchText = await patchRes.text();

        // Extract email from "From: Name <email>" line
        const match = patchText.match(/^From:.*<([^>]+)>/m);
        if (match && match[1] && !match[1].includes("noreply.github.com")) {
          return new Response(JSON.stringify({ email: match[1] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fallback: check commit API email
        const apiEmail = commits[0]?.commit?.author?.email;
        if (apiEmail && !apiEmail.includes("noreply.github.com")) {
          return new Response(JSON.stringify({ email: apiEmail }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {
        continue;
      }
    }

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
