# Kitanda

App de venda a retalho para telemóvel: vendas, produtos, clientes, dívidas e relatórios, com escolha de língua (português, kimbundu, kikongo, cokwe) e funcionamento sem internet.

**App em direto**: https://kitanda-yami.lovable.app

Este projeto foi criado com [Lovable](https://lovable.dev).

## O que está neste código

- `src/` — a app (React + TanStack Start)
- `src/lib/` — regras de negócio, armazenamento no telemóvel, sincronização, línguas
- `src/routes/` — os ecrãs
- `public/` — ícone, manifesto e restantes ficheiros do telemóvel
- `supabase/` — configuração da base de dados (as migrações aplicam-se a partir do Lovable)
- `src/test/` — os testes das regras de dinheiro, stock e sincronização

## Trabalhar localmente

Precisa de Node.js e npm — [instale com nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
npm i
npm run dev
```

Depois abra o endereço que aparecer no terminal.

O ficheiro `.env` leva o endereço da base de dados e a chave pública do projeto. É uma chave pública: serve só para a app falar com a base de dados e não dá acesso de administrador.

## Testes

```sh
npm run test
```

## Aviso importante

Este código **não traz os dados** — as contas, as vendas, os produtos e as dívidas ficam na base de dados do Lovable Cloud. Para levar os dados, exporte-os em **Mais → Base de dados → Gerir → Definições → Exportar dados**.
