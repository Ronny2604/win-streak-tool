import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Fixture {
  id: string;
  home: string;
  away: string;
  league: string;
  odds?: { home: string; draw: string; away: string };
}

interface RequestBody {
  fixtures: Fixture[];
  riskLevel: "conservative" | "moderate" | "aggressive";
  maxPicks: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fixtures, riskLevel, maxPicks } = await req.json() as RequestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um analista de apostas esportivas expert. Analise os jogos fornecidos e gere um bilhete de apostas otimizado.

Regras baseadas no nível de risco "${riskLevel}":
- Conservador: odds entre 1.20-1.60, foco em favoritos claros, máximo 2 seleções
- Moderado: odds entre 1.50-2.20, balanço entre segurança e valor, máximo 3 seleções  
- Agressivo: odds entre 1.80-3.50, busca por value bets, máximo 5 seleções

Sempre justifique cada seleção com análise objetiva.`;

    const userPrompt = `Analise estes jogos e gere um bilhete:

${JSON.stringify(fixtures, null, 2)}

Retorne APENAS um JSON válido no formato:
{
  "picks": [
    {
      "fixture": "Time A vs Time B",
      "market": "Casa/Fora/Empate/Over 2.5/Ambas Marcam",
      "odd": 1.85,
      "confidence": 75,
      "reasoning": "Breve justificativa"
    }
  ],
  "totalOdd": 3.42,
  "confidence": 68,
  "strategy": "Descrição da estratégia usada"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in response");
    }

    const ticket = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ ticket }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI ticket generator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
