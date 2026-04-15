# FinanceHero Landing Page

Landing page institucional da FinanceHero, baseada no briefing de `Agent.MD` e no guia de marca.

## O que esta pronto

- Site estatico com `HTML`, `CSS` e `JavaScript` puro
- Header premium com identidade visual FinanceHero
- Formulario com validacao de nome, e-mail, telefone, CNPJ e consentimento
- Pagina de obrigado com CTA para Calendly
- Captura de leads no Supabase
- Captura de eventos de analytics no Supabase
- Tabela de sessoes unicas para funil e visitantes
- Policies de RLS prontas no schema
- Build pronto para deploy em Vercel

## Estrutura

- `public/index.html`: landing page principal
- `public/obrigado.html`: pagina de obrigado
- `public/styles.css`: estilos globais
- `public/main.js`: formulario, navegacao, analytics e integracoes
- `public/config.js`: configuracao do dominio, Calendly e Supabase
- `supabase/schema.sql`: tabelas de leads e analytics
- `supabase/schema.sql`: tabelas de leads, analytics, sessoes e RLS
- `supabase/functions/capture-lead/index.ts`: endpoint de leads
- `supabase/functions/track-event/index.ts`: endpoint de eventos
- `DEPLOY.md`: passo a passo para GitHub, Supabase e deploy online

## Desenvolvimento local

```bash
npm run dev
```

Servidor local padrao:

`http://127.0.0.1:4181`

## Build

```bash
npm run build
```

O build gera a versao publica em `dist/`.

## Configuracao do front

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

Se `supabase.url` ou `supabase.anonKey` estiverem vazios, o site entra em modo demonstracao e salva os leads localmente para nao quebrar a experiencia.

## Publicacao

Use o guia completo em `DEPLOY.md`.
