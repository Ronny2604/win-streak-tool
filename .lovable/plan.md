

## Plano: Persistência de Login + 5 Funcionalidades Elite

### Problema da Sessão

O Supabase client já está configurado com `persistSession: true` e `autoRefreshToken: true`, então a sessão **já persiste** entre recarregamentos. O problema real é:

1. **LoginPage não redireciona** usuários já logados — se o usuário abre `/login` com sessão ativa, ele vê o formulário de login novamente
2. **Não há redirecionamento automático** ao abrir o app — o usuário precisa clicar em "Login" manualmente mesmo já estando logado

**Correção:**
- Em `LoginPage.tsx`: adicionar `useEffect` que verifica se `user` já existe no `AuthContext` e redireciona para `/` automaticamente
- Em `AuthContext.tsx`: garantir que o listener `onAuthStateChange` é registrado **antes** de `getSession()` (ordem correta conforme docs do Supabase) para evitar race conditions

### 5 Funcionalidades Elite

**1. Comparador de Odds ao Vivo (Live Odds Tracker)**
- Componente `src/components/premium/LiveOddsTracker.tsx`
- Monitora variações de odds em tempo real com gráfico de linha mostrando histórico das últimas horas
- Destaca movimentos suspeitos (variação > 15%) com alerta visual
- Usa dados já disponíveis do `odds-api.ts`

**2. Análise de Correlação entre Jogos**
- Componente `src/components/premium/CorrelationAnalysis.tsx`
- Identifica correlações estatísticas entre resultados de jogos simultâneos (ex: se Time A ganha, probabilidade de Time B ganhar)
- Tabela visual com heatmap de correlações
- Útil para apostas múltiplas inteligentes

**3. Gerador de Relatório Diário com IA**
- Componente `src/components/premium/DailyReport.tsx`
- Gera um relatório completo dos jogos do dia com recomendações personalizadas
- Inclui análise de risco, melhores apostas e jogos a evitar
- Usa Edge Function existente `ai-insights` com prompt especializado

**4. Sistema de Metas e Desafios**
- Componente `src/components/premium/ChallengesSystem.tsx`
- Gamificação: metas semanais (ex: "Acerte 5 apostas seguidas"), badges de conquista, ranking de pontos
- Tabela no banco: `user_challenges` com progresso e recompensas
- Motivação para engajamento contínuo

**5. Detector de Padrões Avançado**
- Componente `src/components/premium/PatternDetector.tsx`
- Analisa histórico de resultados para encontrar padrões recorrentes (ex: "Time X sempre perde após 2 vitórias seguidas")
- Visualização com timeline e indicadores de confiança
- Baseado em dados da API de futebol

### Arquivos Modificados
- `src/pages/LoginPage.tsx` — redirect se já logado
- `src/contexts/AuthContext.tsx` — ordem correta dos listeners

### Arquivos Criados
- `src/components/premium/LiveOddsTracker.tsx`
- `src/components/premium/CorrelationAnalysis.tsx`
- `src/components/premium/DailyReport.tsx`
- `src/components/premium/ChallengesSystem.tsx`
- `src/components/premium/PatternDetector.tsx`

### Arquivos Atualizados
- `src/components/premium/index.ts` — exportar novos componentes
- `src/pages/Index.tsx` — adicionar na sub-nav Premium

### Migração SQL
- Tabela `user_challenges` para o sistema de metas e desafios

