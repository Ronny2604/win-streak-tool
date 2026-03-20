

## Plano: 5 Funcionalidades Premium

### Funcionalidades Propostas

**1. Live Alerts — Alertas Inteligentes de Jogos ao Vivo**
Notificações em tempo real quando acontecem eventos-chave em jogos ao vivo: gols, cartões vermelhos, mudanças drásticas de odds. O usuário configura quais times/ligas quer monitorar. Componente `LiveAlerts.tsx` com painel de configuração e feed de alertas.

**2. Streak Tracker — Sequências e Tendências de Times**
Painel que mostra sequências ativas dos times (vitórias consecutivas, sem sofrer gol, over 2.5 seguidos, etc.). Identifica padrões estatísticos e sugere apostas baseadas em tendências. Componente `StreakTracker.tsx`.

**3. Multi-Bet Builder com IA — Combinador Inteligente**
Evolução do gerador de bilhetes: o usuário define valor da aposta e nível de risco, e a IA monta múltiplas combinações otimizadas com correlações calculadas entre jogos. Mostra probabilidade combinada real vs odds oferecidas. Componente `MultiBetBuilder.tsx`.

**4. Profit Calculator Pro — Calculadora de Lucro Avançada**
Calculadora interativa que simula cenários: apostas simples, múltiplas, sistema (2/3, 3/4), cashout parcial, e dutching. Mostra gráficos de risco/retorno em tempo real. Componente `ProfitCalculator.tsx`.

**5. Insights Feed — Feed de Insights com IA**
Feed personalizado com análises geradas por IA sobre jogos do dia: lesões relevantes, condições climáticas, histórico recente, motivação do time. Cards com resumos rápidos e nível de impacto na aposta. Componente `InsightsFeed.tsx`.

### Implementação Técnica

**Novos arquivos:**
- `src/components/premium/LiveAlerts.tsx`
- `src/components/premium/StreakTracker.tsx`
- `src/components/premium/MultiBetBuilder.tsx`
- `src/components/premium/ProfitCalculator.tsx`
- `src/components/premium/InsightsFeed.tsx`
- `supabase/functions/ai-insights/index.ts` — Edge Function para gerar insights via Lovable AI (Gemini Flash)

**Arquivos editados:**
- `src/components/premium/index.ts` — exportar os 5 novos componentes
- `src/pages/Index.tsx` — adicionar os 5 itens na sub-nav Premium e renderizar os componentes
- Migração SQL para tabela `user_alert_preferences` (times/ligas monitoradas)

**Dados:**
- LiveAlerts e StreakTracker consomem dados já existentes de `odds-api.ts` (live scores + odds)
- InsightsFeed usa Edge Function com Gemini Flash para gerar análises contextuais
- ProfitCalculator e MultiBetBuilder são 100% client-side (cálculos matemáticos)

**Sub-nav Premium atualizada com novos itens:**
- 🔔 Alertas (livealerts)
- 🔥 Streaks (streaks)  
- 🎯 Multi-Bet (multibet)
- 💰 Calculadora (calculator)
- 🧠 Insights (insights)

