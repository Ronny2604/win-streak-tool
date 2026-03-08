const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function scrapeWithFirecrawl(url: string) {
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
      formats: [
        {
          type: 'json',
          schema: {
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
                    status: { type: 'string', description: 'not_started, live, finished, halftime' },
                    minute: { type: 'string' },
                    homeOdds: { type: 'number' },
                    drawOdds: { type: 'number' },
                    awayOdds: { type: 'number' },
                  },
                },
              },
            },
          },
          prompt: 'Extract all football/soccer matches visible on this page. For each match, extract the home team name, away team name, scores (if available), the league/tournament name, country, scheduled time, match status (not_started, live, finished, halftime), current minute (if live), and odds (home win, draw, away win) if available.',
        },
      ],
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
      // Today's matches
      const today = new Date().toISOString().split('T')[0];
      sofascoreUrl = `https://www.sofascore.com/pt/futebol/${today}`;
    }

    console.log(`Scraping: ${sofascoreUrl}`);
    const result = await scrapeWithFirecrawl(sofascoreUrl);

    // Extract the structured JSON from the response
    const events = result?.data?.json?.events || result?.json?.events || [];

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
