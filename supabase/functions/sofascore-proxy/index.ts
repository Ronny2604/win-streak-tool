const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function scrapeWithFirecrawl(url: string, prompt: string, schema: Record<string, unknown>) {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['extract'],
      extract: { schema, prompt },
      waitFor: 3000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Firecrawl error:', JSON.stringify(data));
    throw new Error(data.error || `Firecrawl returned ${response.status}`);
  }

  return data;
}

const eventsSchema = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          homeTeam: { type: 'string' },
          awayTeam: { type: 'string' },
          homeScore: { type: 'number' },
          awayScore: { type: 'number' },
          league: { type: 'string' },
          country: { type: 'string' },
          time: { type: 'string' },
          status: { type: 'string' },
          minute: { type: 'string' },
          homeOdds: { type: 'number' },
          drawOdds: { type: 'number' },
          awayOdds: { type: 'number' },
        },
      },
    },
  },
};

const eventsPrompt = 'Extract ALL football/soccer matches on this page. For each: home team, away team, scores (0 if not started), league name, country, time (HH:MM format), status (not_started/live/finished/halftime), current minute if live, and betting odds (home/draw/away) if shown.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'today';

    let sofascoreUrl: string;

    if (action === 'live') {
      sofascoreUrl = 'https://www.sofascore.com/pt/futebol/jogos-ao-vivo';
    } else {
      const today = new Date().toISOString().split('T')[0];
      sofascoreUrl = `https://www.sofascore.com/pt/futebol/${today}`;
    }

    console.log(`Scraping: ${sofascoreUrl}`);
    const result = await scrapeWithFirecrawl(sofascoreUrl, eventsPrompt, eventsSchema);

    const events = result?.data?.extract?.events || result?.extract?.events || [];
    console.log(`Found ${events.length} events`);

    return new Response(
      JSON.stringify({ success: true, events, action }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg, events: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
