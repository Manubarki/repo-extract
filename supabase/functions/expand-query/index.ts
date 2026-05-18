// Expand a natural-language subject (e.g. "cloud infra") into a richer GitHub
// search query using Lovable AI: synonyms, related keywords, and valid topic slugs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject } = await req.json();
    if (!subject || typeof subject !== "string") {
      return new Response(JSON.stringify({ error: "subject required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You translate a short topic into a GitHub repository search query optimized for SEMANTIC RELEVANCE. " +
              "Return ONLY JSON: {\"keywords\":[2-5 short phrases or terms],\"topics\":[1-5 valid github topic slugs lowercase-hyphenated]}. " +
              "Topics must be REAL widely-used GitHub topic slugs (e.g. kubernetes, terraform, devops, infrastructure-as-code, cloud-computing). " +
              "Do NOT invent slugs. Keywords should be the most descriptive terms a relevant repo's README/description would contain.",
          },
          { role: "user", content: `Topic: ${subject}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error("AI error", aiRes.status, body);
      return new Response(JSON.stringify({ error: "AI gateway error", status: aiRes.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: { keywords?: string[]; topics?: string[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    // GitHub's Search API can return zero results when `OR` mixes free-text
    // phrases with qualifiers like `topic:`. Keep the executable query keyword-
    // only, and return topics separately for UI context/future fallback use.
    const keywords = (parsed.keywords || []).filter((k) => typeof k === "string").slice(0, 3);
    const topics = (parsed.topics || [])
      .filter((t) => typeof t === "string")
      .map((t) => t.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
      .filter(Boolean)
      .slice(0, 2);

    const kwTerms = (keywords.length ? keywords : [subject]).map((k) =>
      k.includes(" ") ? `"${k}"` : k
    );
    const query = `${kwTerms.join(" OR ")} stars:>100`;

    return new Response(JSON.stringify({ query, keywords, topics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expand-query error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
