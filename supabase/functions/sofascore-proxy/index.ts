const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SofaEvent {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  league: string;
  country: string;
  time: string;
  status: string;
  minute: string;
}

async function getMarkdown(url: string): Promise<string> {
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
  if (!response.ok) throw new Error(data.error || `Firecrawl ${response.status}`);
  return data?.data?.markdown || data?.markdown || '';
}

function parseMarkdown(md: string): SofaEvent[] {
  const events: SofaEvent[] = [];
  
  // Each match is a link block ending with ](https://www.sofascore.com/pt/football/match/...)
  // Split by match URLs
  const matchRegex = /\[([^\]]*?)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/match\/[^)]+\)/g;
  
  // Track current league/country from tournament links
  let currentLeague = '';
  let currentCountry = '';
  
  // Find league sections
  const leagueRegex = /\[([^\]]+)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/tournament\/[^)]+\)\s*\[([^\]]+)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/[^)]+\)/g;
  const leaguePositions: Array<{ index: number; league: string; country: string }> = [];
  let lm;
  while ((lm = leagueRegex.exec(md)) !== null) {
    leaguePositions.push({ index: lm.index, league: lm[1], country: lm[2] });
  }
  
  let match;
  while ((match = matchRegex.exec(md)) !== null) {
    const content = match[1];
    const position = match.index;
    
    // Find the most recent league before this match
    for (const lp of leaguePositions) {
      if (lp.index < position) {
        currentLeague = lp.league;
        currentCountry = lp.country;
      }
    }
    
    // Parse content: split by \\ and newlines
    const parts = content
      .split(/\\+\n*/)
      .map(p => p.trim())
      .filter(p => p && p !== '\\' && p !== '');
    
    // Remove image markdown
    const cleanParts = parts.map(p => p.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim()).filter(p => p);
    
    let time = '';
    let minute = '';
    let status = 'not_started';
    let homeTeam = '';
    let awayTeam = '';
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    
    const teamNames: string[] = [];
    const scores: number[] = [];
    
    for (const p of cleanParts) {
      // Time
      if (!time && p.match(/^\d{1,2}:\d{2}$/)) {
        time = p;
        continue;
      }
      
      // Minute (live)
      if (p.match(/^\d+'/)) { minute = p.replace("'", ''); status = 'live'; continue; }
      
      // Status
      if (p === '-') { status = 'not_started'; continue; }
      if (p.match(/^F\d?°?T?$/i) || p === 'Enc.' || p === 'FT' || p.match(/^F\d/)) { status = 'finished'; continue; }
      if (p === 'HT' || p === 'Int.' || p.match(/^Int/)) { status = 'halftime'; minute = 'HT'; continue; }
      if (p === 'Adiado' || p === 'Adiad.') { status = 'postponed'; continue; }
      
      // Single digit = score
      if (p.match(/^\d{1,2}$/) && teamNames.length > 0) {
        scores.push(parseInt(p));
        continue;
      }
      
      // Skip pagination numbers at start
      if (p.match(/^\d+\/\d+$/) || (p.match(/^\d+$/) && teamNames.length === 0)) continue;
      
      // Team name
      if (p.length > 1 && !p.startsWith('http') && !p.match(/^\d+$/)) {
        teamNames.push(p);
      }
    }
    
    if (teamNames.length >= 2) {
      homeTeam = teamNames[0];
      awayTeam = teamNames[1];
      homeScore = scores.length >= 1 ? scores[0] : null;
      awayScore = scores.length >= 2 ? scores[1] : null;
      
      events.push({
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        league: currentLeague,
        country: currentCountry,
        time,
        status,
        minute,
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
    const markdown = await getMarkdown(sofascoreUrl);
    
    const events = parseMarkdown(markdown);
    console.log(`Parsed ${events.length} events`);

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
