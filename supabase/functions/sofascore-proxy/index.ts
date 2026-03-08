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
  
  let currentLeague = '';
  let currentCountry = '';
  
  // Split by league sections - look for tournament links
  const leaguePattern = /\[([^\]]+)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/tournament\/[^)]+\)\s*\[([^\]]+)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/[^)]+\)/g;
  
  // Find all match blocks - they're inside markdown links like [content](matchUrl)
  // Pattern: [time\\\nstatus\\\n![team1](...)\\\nname1\\\n![team2](...)\\\nname2\\\nscore1\\\nscore2](url)
  const matchPattern = /\[(\d{1,2}:\d{2})\\+\n(.*?)\\+\n!\[[^\]]*\]\([^)]*\)\\+\n([^\\]+?)\\+\n!\[[^\]]*\]\([^)]*\)\\+\n([^\\]+?)(?:\\+\n(\d+)\\+\n(\d+))?\]\(https:\/\/www\.sofascore\.com\/pt\/football\/match\//g;
  
  // Actually, let me use a simpler approach: split by match URLs
  // Each match block ends with ](https://www.sofascore.com/pt/football/match/...)
  
  const sections = md.split(/\[!\[([^\]]+)\]\([^)]*\)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/tournament\//);
  
  for (const section of sections) {
    // Check for league name at start  
    const leagueNameMatch = section.match(/^[^)]*\)\s*\[([^\]]+)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/tournament\/[^)]+\)\s*\[([^\]]+)\]/);
    if (leagueNameMatch) {
      currentLeague = leagueNameMatch[1];
      currentCountry = leagueNameMatch[2];
    }
    
    // Find match blocks within this section
    // Each match is wrapped in [...](https://www.sofascore.com/pt/football/match/...)
    const matchBlocks = section.split(/\]\(https:\/\/www\.sofascore\.com\/pt\/football\/match\/[^)]+\)/);
    
    for (const block of matchBlocks) {
      // Match block content separated by \\n\\n or \\\n
      const parts = block.split(/\\+\n+/).map(p => p.replace(/^\[/, '').trim()).filter(p => p && p !== '\\');
      
      if (parts.length < 4) continue;
      
      // Find time (HH:MM format)
      let time = '';
      let minute = '';
      let status = 'not_started';
      let homeTeam = '';
      let awayTeam = '';
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      
      const cleanParts: string[] = [];
      for (const p of parts) {
        const clean = p.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim();
        if (clean) cleanParts.push(clean);
      }
      
      // Parse clean parts
      for (let i = 0; i < cleanParts.length; i++) {
        const p = cleanParts[i];
        
        if (!time && p.match(/^\d{1,2}:\d{2}$/)) {
          time = p;
          continue;
        }
        
        // Status indicators
        if (p.match(/^\d+'/)) { minute = p; status = 'live'; continue; }
        if (p === '-') { status = 'not_started'; continue; }
        if (p.match(/^F\d/i) || p === 'Enc.' || p === 'FT') { status = 'finished'; continue; }
        if (p === 'HT' || p === 'Int.' || p.match(/^Int/)) { status = 'halftime'; minute = 'HT'; continue; }
        if (p.match(/^F2°T/)) { status = 'finished'; continue; }
        
        // Skip numbers that are pagination like "1/2", "5"
        if (p.match(/^\d+\/\d+$/) || (p.match(/^\d+$/) && !homeTeam)) continue;
        
        // Team names (not numbers, not URLs, not status)
        if (!homeTeam && !p.match(/^\d+$/) && p.length > 1 && !p.startsWith('http') && !p.startsWith('![')) {
          homeTeam = p;
          continue;
        }
        
        if (homeTeam && !awayTeam && !p.match(/^\d+$/) && p.length > 1 && !p.startsWith('http') && !p.startsWith('![')) {
          awayTeam = p;
          continue;
        }
        
        // Scores (single digit numbers after teams)
        if (homeTeam && p.match(/^\d+$/)) {
          if (homeScore === null) { homeScore = parseInt(p); continue; }
          if (awayScore === null) { awayScore = parseInt(p); continue; }
        }
      }
      
      if (homeTeam && awayTeam) {
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
    console.log(`Markdown length: ${markdown.length}`);
    
    const events = parseMarkdown(markdown);
    console.log(`Parsed ${events.length} events`);
    if (events.length > 0) {
      console.log(`First 3: ${JSON.stringify(events.slice(0, 3))}`);
    }

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
