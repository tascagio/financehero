# FinanceHero Checkpoint

Ultima atualizacao: 2026-04-12

Objetivo
- Manter um resumo curto e confiavel do estado atual do projeto para que as proximas sessoes recomecem daqui, com menos custo de contexto.
- Atualizar este arquivo a cada rodada de alteracoes relevantes.

Stack atual
- Landing page estatica em `public/`
- Build simples com `npm run build`
- Integracao preparada para Supabase em `supabase/`
- Preview local mais recente validado em `http://127.0.0.1:4182/index.html`

Arquivos principais
- `public/index.html`
- `public/styles.css`
- `public/main.js`
- `public/config.js`
- `public/assets/logo-header-clean.png`
- `supabase/schema.sql`
- `supabase/functions/capture-lead/index.ts`
- `supabase/functions/track-event/index.ts`

Direcao visual atual
- Marca baseada em azul marinho `#051c2c` e dourado `#a6893a`
- Titulos em `Playfair Display`
- Corpo em `Inter`
- Header compacto com efeito de vidro
- Landing page com hero centralizado e visual premium, limpo e objetivo
- Dominio base configurado para `https://financehero.com.br`

Estado atual da landing page
- Header menor, com transparencia e blur
- Logo do topo usando `public/assets/logo-header-clean.png`
- Logo do header ampliado em cerca de 30%
- Navegacao do topo alinhada com a secao `#fit` em `Vire uma Fintech`
- Cursor dos CTAs padronizado com `pointer`, incluindo o botao final do formulario
- Hero principal com headline sobre consultoria estrategica para a era da IA
- CTA principal: `Solicitar diagnostico gratis`
- Transicao dourada entre a dobra 1 e a dobra 2 removida
- Secao `#dores` reescrita para enfatizar operacao cara, monetizacao travada e tecnologia sem ROI
- Secao de metodo em formato de carrossel horizontal
- Eyebrow da secao de metodo atualizada para `O nosso metodo poderoso. Entrega em 30 dias.`
- Headline da secao de entrega atualizada para `O que a FinanceHero entrega.`
- Textos de apoio das secoes `#solucao` e `#metodo` removidos
- Secao `#fit` reposicionada para a tese de embedded finance / fintech white-label
- Bloco intermediario entre `#fit` e formulario com frase hero em dourado e logo centralizado
- Secao tecnica de arquitetura removida
- CTA escuro intermediario removido
- Formulario simplificado e centralizado
- Formulario compactado para ocupar menos area visual
- Campo `CNPJ` obrigatorio no front e no endpoint
- Secao de FAQ removida
- Fechamento visual com frase hero removido
- Rodape reduzido para `FinanceHero | Todos os direitos reservados.`

Integracao e dados
- Formulario preparado para enviar leads ao Supabase
- Eventos e analytics preparados no front e nas edge functions
- Funil com `page_view`, `cta_click`, `form_start`, `form_submit_attempt`, `form_submit_success`, `form_submit_error`, `section_view`, `scroll_depth`, `privacy_banner_accept` e `privacy_banner_reject`
- Tabela `sessions` criada para visitantes unicos e conversao por sessao
- `track-event` faz upsert de sessao por `session_id`
- RLS configurado para `leads`, `analytics_events` e `sessions`
- E-mail de destino configurado no fluxo como `giovanni@financehero.com.br`
- Modo demo continua funcionando se credenciais nao estiverem preenchidas em `public/config.js`
- Pagina de obrigado simplificada com CTA de agendamento gratis
- Calendly configurado em `public/config.js` com `https://calendly.com/giovanni-financehero/30min`
- Edge Function `capture-lead` preparada para enviar notificacao real por e-mail via Resend
- Para envio real, o Supabase precisa dos secrets `RESEND_API_KEY` e `LEAD_NOTIFICATION_FROM`
- Fallback do CTA de agendamento corrigido para voltar ao formulario quando o Calendly nao estiver configurado
- Validacao de faturamento simplificada sem mensagem herdada do ICP anterior
- Documentacao finalizada em `README.md` e `DEPLOY.md` para GitHub, Supabase e Vercel
- Banner de privacidade ajustado para evitar disparo duplicado ao aceitar ou recusar
- Hover dourado do menu limitado aos links de navegacao, sem afetar o CTA do header
- Ajustes de alinhamento mobile aplicados em header, cards, tipografia e espacamentos
- Falha no provedor de e-mail nao interrompe mais a gravacao do lead no Supabase

Pendencias conhecidas
- Sempre validar visualmente no preview apos mudancas grandes de layout
- A porta `4181` pode exibir cache antigo; a validacao mais recente foi feita na `4182`
- Existe uma pasta temporaria `.brand_extract` no workspace, ainda nao removida

Checklist para a proxima sessao
- Ler este arquivo primeiro
- Confirmar se `public/index.html` e `public/styles.css` continuam sendo a base principal
- Atualizar este checkpoint ao final de qualquer nova alteracao relevante
