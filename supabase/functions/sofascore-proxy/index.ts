const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOFASCORE_API = 'https://api.sofascore.com/api/v1';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.sofascore.com/',
  'Origin': 'https://www.sofascore.com',
};

async function fetchSofaScore(path: string) {
  const res = await fetch(`${SOFASCORE_API}${path}`, { headers: HEADERS });
  if (!res.ok) {
    console.error(`SofaScore API error: ${res.status} for path: ${path}`);
    throw new Error(`SofaScore API returned ${res.status}`);
  }
  return res.json();
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'today';

    let data;

    if (action === 'live') {
      // Fetch live football events
      data = await fetchSofaScore('/sport/football/events/live');
    } else if (action === 'today') {
      // Fetch today's scheduled events
      const today = formatDate(new Date());
      data = await fetchSofaScore(`/sport/football/scheduled-events/${today}`);
    } else if (action === 'odds') {
      const eventId = url.searchParams.get('eventId');
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: 'eventId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      data = await fetchSofaScore(`/event/${eventId}/odds/1/all`);
    } else if (action === 'stats') {
      const eventId = url.searchParams.get('eventId');
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: 'eventId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      data = await fetchSofaScore(`/event/${eventId}/statistics`);
    } else if (action === 'h2h') {
      const eventId = url.searchParams.get('eventId');
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: 'eventId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      data = await fetchSofaScore(`/event/${eventId}/h2h`);
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
