const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function scrapeMarkdown(url: string) {
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
      formats: ['markdown'],
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

// Parse markdown content into structured events
function parseEvents(markdown: string): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = [];
  const lines = markdown.split('\n').filter(l => l.trim());
  
  let currentLeague = '';
  let currentCountry = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect league headers (usually bold or heading)
    if (line.startsWith('#') || line.startsWith('**')) {
      const cleaned = line.replace(/[#*]+/g, '').trim();
      if (cleaned && !cleaned.match(/^\d/) && cleaned.length > 2) {
        // Could be "Country · League" or just "League"
        const parts = cleaned.split(/[·\-–—]/);
        if (parts.length >= 2) {
          currentCountry = parts[0].trim();
          currentLeague = parts[1].trim();
        } else {
          currentLeague = cleaned;
        }
      }
      continue;
    }
    
    // Try to detect match lines: "Team1 X - Y Team2" or "Team1 vs Team2" patterns
    const scoreMatch = line.match(/^(.+?)\s+(\d+)\s*[-:]\s*(\d+)\s+(.+?)$/);
    const vsMatch = line.match(/^(.+?)\s+(?:vs?\.?|x)\s+(.+?)$/i);
    const timeMatch = line.match(/(\d{1,2}:\d{2})/);
    
    if (scoreMatch) {
      events.push({
        homeTeam: scoreMatch[1].replace(/[*_]/g, '').trim(),
        awayTeam: scoreMatch[4].replace(/[*_]/g, '').trim(),
        homeScore: parseInt(scoreMatch[2]),
        awayScore: parseInt(scoreMatch[3]),
        league: currentLeague,
        country: currentCountry,
        time: timeMatch?.[1] || '',
        status: 'live',
      });
    } else if (vsMatch && !line.includes('http')) {
      events.push({
        homeTeam: vsMatch[1].replace(/[*_]/g, '').trim(),
        awayTeam: vsMatch[2].replace(/[*_]/g, '').trim(),
        homeScore: 0,
        awayScore: 0,
        league: currentLeague,
        country: currentCountry,
        time: timeMatch?.[1] || '',
        status: 'not_started',
      });
    }
  }
  
  return events;
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
    const result = await scrapeMarkdown(sofascoreUrl);
    
    const markdown = result?.data?.markdown || result?.markdown || '';
    console.log(`Markdown length: ${markdown.length}`);
    console.log(`Markdown preview: ${markdown.substring(0, 500)}`);
    
    const events = parseEvents(markdown);
    console.log(`Parsed ${events.length} events`);

    return new Response(
      JSON.stringify({ success: true, events, action, rawLength: markdown.length }),
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
