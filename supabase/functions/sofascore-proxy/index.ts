const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function scrapeWithFirecrawl(url: string) {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  // First get markdown, then use it to extract structured data
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'extract'],
      extract: {
        schema: {
          type: 'object',
          properties: {
            matches: {
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
                },
              },
            },
          },
        },
        prompt: 'Extract ALL football matches from this page. Each match has: home team name, away team name, scores (use -1 if not started yet), league/tournament name, country, start time, match status (one of: live, finished, not_started, halftime, postponed), and current minute if the match is live. Get as many matches as possible.',
      },
      waitFor: 5000,
      onlyMainContent: true,
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
      const today = new Date().toISOString().split('T')[0];
      sofascoreUrl = `https://www.sofascore.com/pt/futebol/${today}`;
    }

    console.log(`Scraping: ${sofascoreUrl}`);
    const result = await scrapeWithFirecrawl(sofascoreUrl);

    // Try extract first, fallback to parsing
    const extract = result?.data?.extract || result?.extract;
    const events = extract?.matches || [];
    
    console.log(`Found ${events.length} events via extract`);

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
