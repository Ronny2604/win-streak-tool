const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_FOOTBALL_KEY = 'd28a1069bc56332e46147be343abb995';
const API_URL = 'https://v3.football.api-sports.io';

async function fetchAPI(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${API_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY },
  });
  
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return res.json();
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'today';
    const league = url.searchParams.get('league') || '';

    let data;

    if (action === 'live') {
      data = await fetchAPI('/fixtures', { live: 'all' });
    } else if (action === 'today') {
      const params: Record<string, string> = { date: formatDate(new Date()) };
      if (league) { params.league = league; params.season = '2024'; }
      data = await fetchAPI('/fixtures', params);
    } else if (action === 'odds') {
      const fixtureId = url.searchParams.get('fixtureId');
      if (!fixtureId) throw new Error('fixtureId required');
      data = await fetchAPI('/odds', { fixture: fixtureId });
    } else if (action === 'predictions') {
      const fixtureId = url.searchParams.get('fixtureId');
      if (!fixtureId) throw new Error('fixtureId required');
      data = await fetchAPI('/predictions', { fixture: fixtureId });
    } else if (action === 'h2h') {
      const h2h = url.searchParams.get('h2h');
      if (!h2h) throw new Error('h2h (team1-team2) required');
      data = await fetchAPI('/fixtures/headtohead', { h2h, last: '5' });
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
