

## Auditoria Completa — Pronto para Vendas?

### Status Geral: **~85% pronto**. Existem itens pendentes que impactam a experiência do usuário e o fluxo de pagamento.

---

### O QUE ESTÁ FUNCIONANDO

1. **Autenticação**: Login/Signup com email, Google OAuth, reset de senha, sessão persistente, redirect automático
2. **Freemium model**: Acesso básico grátis (5 jogos), upgrade via chave ou Stripe
3. **Stripe checkout**: Edge functions `create-checkout` e `check-subscription` prontas
4. **Admin Panel**: Gerenciamento de chaves, bilhetes, cupons Stripe, personalização, API settings
5. **Dados de futebol**: Integração com The Odds API (odds, live scores)
6. **25 ferramentas Premium/Elite**: Dashboard, IA, H2H, Rankings, Odds, Calendar, etc.
7. **Bilhetes**: Geração, salvamento, histórico, auto-settle com matching melhorado
8. **NBA**: Seção dedicada
9. **Perfil**: Avatar upload, temas, personalização
10. **Cupons de desconto**: Criação e listagem via Stripe API

---

### O QUE FALTA CORRIGIR (7 itens)

**1. Campo de cupom ausente no checkout (CRÍTICO para vendas)**
- O admin cria cupons, mas o `PremiumPage.tsx` **não tem campo para o usuário inserir o cupom** ao assinar
- O `create-checkout/index.ts` **não aceita parâmetro `coupon`** na sessão Stripe
- **Solução**: Adicionar input de cupom na PremiumPage + passar coupon ID para o `create-checkout` que aplica via `discounts` no `stripe.checkout.sessions.create`

**2. Nome do app inconsistente**
- LoginPage usa "RonnyBR", ResetPasswordPage usa "PropsBR"
- **Solução**: Padronizar o nome em todas as páginas

**3. Surebet notifier ainda ativo (console/session replay)**
- O `useSurebetNotifier` ainda mostra notificação "1 surebet(s) ativa(s)" com bell animada
- O usuário pediu para remover essas notificações anteriormente
- **Solução**: Verificar se o notifier foi desabilitado corretamente ou remover a chamada do `useSurebetNotifier`

**4. Console warnings de React refs**
- `EliteBadge` e `MiniChart` não usam `forwardRef` mas recebem refs do `MatchCard`
- **Solução**: Adicionar `forwardRef` nos componentes ou remover refs desnecessárias

**5. ProfilePage não verifica subscription do Stripe**
- `isPro` no ProfilePage usa apenas `isAdmin || keySession.plan === "pro"` mas **ignora `subscription.subscribed`**
- Usuários que assinaram via Stripe não verão status PRO no perfil
- **Solução**: Adicionar `|| subscription.subscribed` na variável `isPro` do ProfilePage

**6. BottomNav não tem aba "Ao Vivo"**
- O desktop tem tab "Ao Vivo" mas o BottomNav mobile não inclui essa opção
- Não é bloqueante mas é uma funcionalidade premium que fica inacessível no mobile
- **Solução**: Opcional — avaliar se quer adicionar

**7. Trigger `handle_new_user` não registrado**
- A função SQL `handle_new_user()` existe mas os triggers mostram "no triggers in the database"
- Novos usuários podem não ter perfil criado automaticamente, causando erros no avatar e personalização
- **Solução**: Criar migration com `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`

---

### PLANO DE IMPLEMENTAÇÃO

**Arquivos a editar:**
- `src/pages/PremiumPage.tsx` — adicionar campo de cupom
- `supabase/functions/create-checkout/index.ts` — aceitar e aplicar cupom
- `src/pages/ResetPasswordPage.tsx` — corrigir nome do app
- `src/pages/ProfilePage.tsx` — incluir `subscription.subscribed` no `isPro`
- `src/components/EliteBadge.tsx` — adicionar `forwardRef`
- `src/components/MiniChart.tsx` — adicionar `forwardRef`
- `src/hooks/useSurebetNotifier.ts` — verificar se notificações foram desativadas

**Migração SQL:**
- Criar trigger `on_auth_user_created` para auto-criar perfis

**Prioridade:**
1. Campo de cupom no checkout (essencial para vendas com descontos)
2. Trigger de perfil (essencial para novos usuários)
3. Fix `isPro` no ProfilePage (essencial para assinantes Stripe)
4. Corrigir nome do app (visual)
5. Corrigir warnings de ref (qualidade)
6. Verificar surebet notifier (UX)

