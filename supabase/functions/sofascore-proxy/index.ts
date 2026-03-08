const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOFASCORE_API = 'https://api.sofascore.com/api/v1';

async function fetchSofaScore(path: string) {
  const res = await fetch(`${SOFASCORE_API}${path}`, {
    headers: {
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) {
    // Try mobile API as fallback
    const mobileRes = await fetch(`https://api.sofascore.app/api/v1${path}`, {
      headers: { 'Accept': '*/*' },
    });
    if (!mobileRes.ok) {
      console.error(`SofaScore API error: ${mobileRes.status} for path: ${path}`);
      throw new Error(`SofaScore API returned ${mobileRes.status}`);
    }
    return mobileRes.json();
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
      data = await fetchSofaScore('/sport/football/events/live');
    } else if (action === 'today') {
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
