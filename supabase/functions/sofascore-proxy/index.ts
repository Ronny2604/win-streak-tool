const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// API-Football via RapidAPI (alternative endpoint)
const API_KEY = 'd28a1069bc56332e46147be343abb995';

async function fetchAPI(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://v3.football.api-sports.io${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  // Try both header formats
  let res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY },
  });
  
  if (!res.ok || (await res.clone().json()).errors?.token) {
    // Try RapidAPI format
    const rapidUrl = new URL(`https://api-football-v1.p.rapidapi.com/v3${endpoint}`);
    Object.entries(params).forEach(([k, v]) => rapidUrl.searchParams.set(k, v));
    
    res = await fetch(rapidUrl.toString(), {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      },
    });
  }
  
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  
  if (data.errors?.token) {
    console.error('API key error:', JSON.stringify(data.errors));
    throw new Error('Invalid API key');
  }
  
  return data;
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
      if (!h2h) throw new Error('h2h required');
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
      JSON.stringify({ error: msg, response: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
