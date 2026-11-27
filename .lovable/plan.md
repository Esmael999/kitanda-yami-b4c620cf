# Convite com link único para ajudantes

## O que a dona da loja vai ver
- No ecrã **Equipa**, ao convidar: nome, email e (novo) **número de telefone** do ajudante.
- Depois de convidar, aparece um cartão "Convite pronto" com 3 botões:
  - **Enviar por WhatsApp** (abre o WhatsApp já com a mensagem e o link)
  - **Enviar por SMS** (abre as mensagens do telemóvel já preenchidas)
  - **Copiar link**
- Cada ajudante na lista mostra: "à espera" ou "já entrou", e o botão **Reenviar convite**.
- A mensagem é enviada pelo próprio telemóvel da dona — sem custos extra nem contas de serviços externos.

## O que o ajudante vai ver ao abrir o link
Página "Convite para a Loja de Celma Eduardo":
1. Explicação curta: "Foi convidado para ajudar nesta loja. Crie a sua conta — a palavra-passe é só sua, ninguém da loja a conhece."
2. Nome e email já preenchidos (o email não se pode mudar, é o que liga à loja).
3. Campo para criar a própria palavra-passe, com dica de palavra-passe segura.
4. Botão **Criar conta e entrar na loja** — entra logo com as permissões escolhidas.
- Se o link já foi usado, cancelado ou expirou (ex.: 7 dias): mensagem clara a pedir novo convite à dona.
- Se o ajudante já tiver conta com esse email: botão "Já tenho conta — entrar".

## Mensagem enviada (exemplo)
"Olá João! A Celma convidou-o para ajudar na Loja de Celma Eduardo no Kitanda Yami. Abra este link, crie a sua palavra-passe e entre: https://kitanda-yami.lovable.app/convite/AB12CD"

## Fica para depois (opcional)
- Envio **automático** de SMS/WhatsApp pelo servidor (precisa de conta paga num serviço de mensagens, ex. Twilio, e cuidados contra abuso). Só se a dona quiser.

## Detalhes técnicos
- Base de dados: em `employees` adicionar `phone`, `invite_token` (aleatório, único), `invite_expires_at`, `invite_used_at`. Migração com GRANTs/RLS mantidos.
- RPC `invite_employee` passa a receber `_phone` e devolver o token; nova RPC `renew_invite(_id)` (só dono) gera novo token.
- RPC pública `get_invite(_token)` (security definer, anon) devolve só nome da loja, nome e email do ajudante e estado — nada mais.
- `handle_new_user()` já liga a conta ao convite pelo email; passa também a marcar `invite_used_at` e a recusar convites expirados.
- Nova página `src/routes/convite.$token.tsx`; `isAuthPage` aceita `/convite/*` para visitantes sem sessão; head() próprio.
- Links: `whatsappLink()` existente e `sms:+244…?body=…`; telefone guardado em formato 244.
- Textos novos em `src/lib/i18n.ts`; testes para expiração/uso único do convite e formato do link SMS.
