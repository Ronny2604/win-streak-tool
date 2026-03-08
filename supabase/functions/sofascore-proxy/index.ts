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
  const lines = md.split('\n');
  
  let currentLeague = '';
  let currentCountry = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect league links: [MLS](url) [EUA](url) or similar
    const leagueMatch = line.match(/\[([^\]]+)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/tournament\/.+?\)/);
    if (leagueMatch) {
      currentLeague = leagueMatch[1];
      // Country is usually the next link on same or next line
      const countryMatch = line.match(/\[([^\]]+)\]\(https:\/\/www\.sofascore\.com\/pt\/football\/[^/]+\)$/);
      if (countryMatch) {
        currentCountry = countryMatch[1];
      }
      continue;
    }
    
    // Detect time patterns like "16:30" or "HT" or "65'" at line start
    const timeLineMatch = line.match(/^(\d{1,2}:\d{2})/);
    const minuteMatch = line.match(/(\d+)'/);
    const isHT = line.includes('HT') || line.includes('Int.');
    
    // Detect team names by looking for team image patterns
    // Pattern: ![TeamName or [TeamName](url)
    // Then look for scores in nearby lines
    
    // SofaScore markdown has patterns like:
    // "16:30\n\n65'\n\n![New York Red Bulls](...) New York Red Bulls\n\n2\n\n![Columbus Crew](...) Columbus Crew\n\n1"
    // Let's look for team image patterns
    const teamImgMatch = line.match(/!\[([^\]]+)\].*?\)\s*(.+?)$/);
    if (teamImgMatch) {
      const teamName = teamImgMatch[2]?.trim() || teamImgMatch[1]?.trim();
      
      // Look backwards for time/status
      let time = '';
      let minute = '';
      let status = 'not_started';
      
      for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
        const prevLine = lines[j].trim();
        const tMatch = prevLine.match(/^(\d{1,2}:\d{2})$/);
        if (tMatch) { time = tMatch[1]; break; }
        const mMatch = prevLine.match(/^(\d+)'$/);
        if (mMatch) { minute = mMatch[1]; status = 'live'; }
        if (prevLine === 'HT' || prevLine === 'Int.') { status = 'halftime'; minute = 'HT'; }
        if (prevLine === 'FT' || prevLine === 'Enc.') { status = 'finished'; }
      }
      
      // Look forward for score and opponent
      let score: number | null = null;
      let awayTeam = '';
      let awayScore: number | null = null;
      
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        const nextLine = lines[j].trim();
        
        // Score line (just a number)
        if (score === null && nextLine.match(/^\d+$/)) {
          score = parseInt(nextLine);
          continue;
        }
        
        // Next team
        const nextTeamMatch = nextLine.match(/!\[([^\]]+)\].*?\)\s*(.+?)$/);
        if (nextTeamMatch) {
          awayTeam = nextTeamMatch[2]?.trim() || nextTeamMatch[1]?.trim();
          // Look for away score
          for (let k = j + 1; k < Math.min(lines.length, j + 3); k++) {
            const scoreLine = lines[k].trim();
            if (scoreLine.match(/^\d+$/)) {
              awayScore = parseInt(scoreLine);
              break;
            }
          }
          break;
        }
      }
      
      if (awayTeam) {
        events.push({
          homeTeam: teamName,
          awayTeam,
          homeScore: score,
          awayScore,
          league: currentLeague,
          country: currentCountry,
          time,
          status,
          minute,
        });
        // Skip ahead to avoid duplicates
        i += 5;
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
    
    // Log a sample of the markdown structure for debugging
    const sampleLines = markdown.split('\n').slice(0, 80).join('\n');
    console.log(`Sample:\n${sampleLines}`);
    
    const events = parseMarkdown(markdown);
    console.log(`Parsed ${events.length} events`);
    if (events.length > 0) {
      console.log(`First event: ${JSON.stringify(events[0])}`);
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
