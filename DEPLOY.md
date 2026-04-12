# Deploy FinanceHero

Este projeto e um site estatico com formulario integrado ao Supabase.

## 1. GitHub

1. Crie um repositorio novo no GitHub.
2. Envie os arquivos do projeto para esse repositorio.
3. O arquivo `dist/` esta no `.gitignore`. O deploy deve ser feito a partir do build automatico.

## 2. Supabase

### Criar o banco

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Rode o conteudo de `supabase/schema.sql`.
4. Esse schema cria:

- `leads`
- `analytics_events`
- `sessions`
- policies de RLS para leitura autenticada e escrita via `service_role`

### Dados que voce vai precisar copiar

- `Project URL`
- `anon public key`
- `service_role key`

### Configurar o front

Edite `public/config.js`:

```js
window.FINANCEHERO_CONFIG = {
  siteUrl: "https://financehero.com.br",
  calendlyUrl: "https://calendly.com/giovanni-financehero/30min",
  whatsappUrl: "",
  contactEmail: "giovanni@financehero.com.br",
  analyticsEnabled: true,
  supabase: {
    url: "https://SEU-PROJETO.supabase.co",
    anonKey: "SUA_SUPABASE_ANON_KEY",
    functions: {
      captureLead: "capture-lead",
      trackEvent: "track-event"
    }
  }
};
```

### Deploy das Edge Functions

Com o Supabase CLI instalado e autenticado:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy capture-lead
supabase functions deploy track-event
```

### Secrets obrigatorios

```bash
supabase secrets set SUPABASE_URL=https://SEU-PROJETO.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
supabase secrets set ALLOWED_ORIGIN=https://financehero.com.br
```

### Secrets opcionais

Se quiser notificacao real por e-mail via Resend:

```bash
supabase secrets set RESEND_API_KEY=SEU_RESEND_API_KEY
supabase secrets set LEAD_NOTIFICATION_FROM="FinanceHero <leads@financehero.com.br>"
supabase secrets set LEAD_NOTIFICATION_TO=giovanni@financehero.com.br
```

Sem esses dois secrets opcionais, o lead continua sendo salvo no Supabase normalmente.

## 3. Publicar o site

Recomendacao simples: Vercel.

O projeto ja inclui `vercel.json` com:

- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`

Passos:

1. Conecte o repositorio do GitHub na Vercel.
2. Importe o projeto.
3. Confirme o build `npm run build`.
4. Confirme o output `dist`.
5. Publique.

## 4. Dominio

Depois do deploy:

1. Adicione `financehero.com.br` na Vercel.
2. Configure os registros DNS exatamente como a Vercel orientar.
3. Garanta que o `ALLOWED_ORIGIN` no Supabase esteja igual ao dominio final publicado.

Se usar `www.financehero.com.br`, atualize tambem:

- `public/config.js`
- `public/index.html`
- `public/robots.txt`
- `public/sitemap.xml`
- secrets `ALLOWED_ORIGIN`

## 5. Checklist final

- `public/config.js` preenchido com `supabase.url` e `supabase.anonKey`
- `supabase/schema.sql` executado
- `capture-lead` deployada
- `track-event` deployada
- secrets do Supabase configurados
- site publicado na Vercel
- formulario testado em producao
- lead aparecendo na tabela `public.leads`
- sessao aparecendo na tabela `public.sessions`
- pagina de obrigado abrindo corretamente
- botao de Calendly abrindo corretamente

## 6. Smoke test

Depois de subir:

1. Abra a home.
2. Aceite ou recuse o banner de privacidade.
3. Preencha o formulario inteiro.
4. Envie.
5. Confirme redirecionamento para `obrigado.html`.
6. Verifique se o lead entrou no Supabase.
7. Verifique se os eventos apareceram em `analytics_events`.
8. Verifique se a sessao apareceu em `sessions`.

## Links oficiais uteis

- Supabase Functions: https://supabase.com/docs/guides/functions
- Deploy de Functions: https://supabase.com/docs/guides/functions/deploy
- Secrets em Functions: https://supabase.com/docs/guides/functions/secrets
- Vercel com GitHub: https://vercel.com/docs/deployments/git/vercel-for-github
- Configuracao do projeto na Vercel: https://vercel.com/docs/project-configuration
