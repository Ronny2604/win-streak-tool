import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const BASE = "https://v3.football.api-sports.io";

async function apiFetch(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, teamId, leagueId, season, fixtureId } = await req.json();

    let data: unknown;

    switch (action) {
      case "team_statistics": {
        const result = await apiFetch("/teams/statistics", {
          team: String(teamId),
          league: String(leagueId),
          season: String(season || 2024),
        });
        const stats = result.response;
        data = {
          cards: stats?.cards || null,
          fixtures: stats?.fixtures || null,
          goals: stats?.goals || null,
          form: stats?.form || null,
          clean_sheet: stats?.clean_sheet || null,
          penalty: stats?.penalty || null,
        };
        break;
      }

      case "fixture_statistics": {
        // Get live/post-match statistics for a specific fixture
        const result = await apiFetch("/fixtures/statistics", {
          fixture: String(fixtureId),
        });
        data = result.response;
        break;
      }

      case "fixture_events": {
        // Get events (goals, cards, subs) for a fixture
        const result = await apiFetch("/fixtures/events", {
          fixture: String(fixtureId),
        });
        data = result.response;
        break;
      }

      case "predictions": {
        // Get AI predictions for a fixture
        const result = await apiFetch("/predictions", {
          fixture: String(fixtureId),
        });
        data = result.response;
        break;
      }

      case "head2head": {
        // Get H2H between two teams
        const result = await apiFetch("/fixtures/headtohead", {
          h2h: String(teamId), // format: "teamId1-teamId2"
          last: "10",
        });
        data = result.response;
        break;
      }

      case "search_team": {
        // Search for a team by name
        const result = await apiFetch("/teams", {
          search: String(teamId), // reusing teamId as search term
        });
        data = result.response;
        break;
      }

      case "fixtures_by_date": {
        // Get fixtures for a specific date
        const today = new Date().toISOString().split("T")[0];
        const params: Record<string, string> = { date: today };
        if (leagueId) {
          params.league = String(leagueId);
          params.season = String(season || 2025);
        }
        const result = await apiFetch("/fixtures", params);
        data = result.response;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
