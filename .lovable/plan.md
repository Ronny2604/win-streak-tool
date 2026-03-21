

## Plano: Corrigir Salvamento de Bilhetes + Multi-Bet Save + Alertas Persistentes + Auto-Settle Melhorado

### Problemas Identificados

1. **Bilhetes não salvam ao criar**: O `TicketsSection` tem botão de salvar mas o `useSavedTickets.saveMutation` pode falhar silenciosamente se o `created_by` for "anon" e houver problema de tipo. O formato dos `selections` salvos (com `fixture` completo da `NormalizedFixture`) nem sempre contém `teams.home.name` e `teams.away.name` no formato esperado pelo auto-settle.

2. **Multi-Bet Builder não tem botão de salvar**: O componente `MultiBetBuilder.tsx` gera combinações mas não tem nenhuma ação para salvar no banco. Precisa de um botão "Salvar Bilhete" em cada combinação.

3. **Live Alerts não persiste times monitorados**: O `monitoredTeams` é state local (`useState`), se recarregar a página perde tudo. Precisa salvar no `localStorage` no mínimo.

4. **Auto-settle precisa melhorar**: O `useAutoSettle` depende de match por nome de time (`teamsMatch`), que pode falhar com nomes diferentes entre a API de odds e os dados salvos. Além disso, o `getCompletedScores` usa a Odds API que retorna `completed: true` mas o `normalizeOddsEvent` marca como `status.short: "FT"` — isso funciona, mas os scores podem ser `null` se a API não retornar `scores`.

### Correções

**1. `src/components/TicketsSection.tsx`** — Melhorar feedback de erro no save e garantir que o save funciona corretamente

**2. `src/components/premium/MultiBetBuilder.tsx`** — Adicionar botão "Salvar Bilhete" em cada combinação gerada, usando `useSavedTickets().saveTicket` com formato compatível

**3. `src/components/premium/LiveAlerts.tsx`** — Persistir `monitoredTeams` em `localStorage`, carregar no mount

**4. `src/hooks/useAutoSettle.ts`** — Melhorar matching de times: normalizar mais agressivamente (remover acentos, sufixos comuns), e também tentar match parcial por palavras-chave. Tratar caso onde `sel.betType` pode estar como label textual em vez de enum.

**5. `src/components/TicketsHistory.tsx`** — Melhorar o botão Auto para mostrar quantos bilhetes foram resolvidos

### Arquivos Modificados
- `src/components/TicketsSection.tsx` — melhorar save com error handling
- `src/components/premium/MultiBetBuilder.tsx` — botão salvar bilhete por combinação
- `src/components/premium/LiveAlerts.tsx` — persistir times no localStorage
- `src/hooks/useAutoSettle.ts` — melhorar matching de nomes e tratar betType label
- `src/components/TicketsHistory.tsx` — feedback melhorado no auto-settle

### Detalhes Técnicos

**MultiBetBuilder save**: Converter formato `Combination` para `BettingTicket` com `selections` contendo `fixture` com `teams.home.name` e `teams.away.name` para compatibilidade com auto-settle.

**LiveAlerts localStorage**:
```typescript
useEffect(() => {
  const saved = localStorage.getItem("monitored-teams");
  if (saved) setMonitoredTeams(JSON.parse(saved));
}, []);
useEffect(() => {
  localStorage.setItem("monitored-teams", JSON.stringify(monitoredTeams));
}, [monitoredTeams]);
```

**AutoSettle matching melhorado**: Remover acentos com `normalize("NFD").replace(/[\u0300-\u036f]/g, "")`, remover sufixos de liga (FC, SC, CF, etc.), e fazer match bidirecional por tokens.

