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

# Tradução completa para kimbundu
- Hoje só as palavras principais estão em kimbundu; o resto aparece em português.
- Passar todos os textos de todos os ecrãs (entrar, vender, produtos, kilapé, clientes, relatórios, definições, equipa, convite) para o dicionário de línguas e traduzi-los para kimbundu.
- Aviso sincero: a tradução será um rascunho feito por mim. O kimbundu tem variantes e poucos exemplos escritos; deve ser revista por alguém que fale bem a língua antes de mostrar a clientes.
- Entrego também uma lista com todas as frases (português ↔ kimbundu) para essa pessoa corrigir facilmente.
- Técnico: mover textos fixos dos ecrãs para chaves em `src/lib/i18n.ts`; teste garante que nenhuma chave fica vazia em kimbundu.

# Entrar e criar conta com telefone + palavra-passe
- Nos ecrãs Entrar e Criar conta: escolha simples "Telefone" ou "Email" (telefone primeiro).
- Telefone em formato angolano (+244, 9 dígitos), com palavra-passe criada pela própria pessoa.
- O convite do ajudante passa a aceitar telefone em vez de email; a conta liga-se à loja pelo número.
- Sem custos de SMS: o número funciona como nome de utilizador (não é enviado código).
- Limitação sincera: sem email, recuperar a palavra-passe esquecida terá de ser feito pela dona da loja (botão "repor palavra-passe do ajudante") ou com um email adicionado depois.
- Técnico: o número é guardado de forma normalizada e convertido internamente numa identificação de conta; confirmação automática só para contas por telefone; `handle_new_user()` e convites passam a reconhecer telefone.

# Prompt pronto a usar
"Na Kitanda Yami, nos ecrãs Entrar e Criar conta, acrescenta a opção de entrar com número de telefone angolano (+244) e palavra-passe, além do email, sem mudar o design. No ecrã Equipa, cria um convite com link único (válido 7 dias, uso único) que a dona envia ao ajudante por WhatsApp, SMS ou copiando o link. O link abre uma página que explica ao ajudante como criar a própria conta com o telefone ou email já preenchido e definir a sua palavra-passe, ligando-o logo à loja com as permissões escolhidas. Mostra 'à espera' ou 'já entrou' e permite reenviar o convite. Traduz todos os ecrãs para kimbundu como rascunho a rever por um falante."

# Dicionário completo do app
- Recolher todas as palavras e frases de todos os ecrãs, botões, avisos, erros e comprovativos.
- Entregar um ficheiro Excel (e PDF) em Ficheiros com colunas: Ecrã · Português · Kimbundu · Kikongo · Cokwe · Observações.
- Linhas já traduzidas vêm preenchidas (marcadas "rascunho"); as restantes ficam vazias para o revisor completar.
- Depois de revisto, o ficheiro pode ser devolvido e eu aplico as traduções no app.
