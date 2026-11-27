# Convites de equipa — preparação para lançamento

A proposta SQL encontra-se em docs/team-invites.sql e não é uma migração aplicada. Rever com a equipa, executar primeiro num ambiente isolado, gerar os tipos e só então activar o frontend. A versão actual e convites antigos são preservados; os novos convites usam uma tabela privada e só atribuem permissões após confirmação do contacto e resgate atómico. O link tem 7 dias, token aleatório guardado apenas como hash e reenvio roda o token. Não transferir contas de proprietários existentes automaticamente.

Configurar Supabase Auth: telefone, fornecedor SMS e confirmação obrigatória de email e telefone, mínimo de seis caracteres e política de palavras-passe compatível. Não desactivar verificação para contornar SMS. Permitir URL de confirmação /entrar. Validar e-mail e telefone angolano reais antes do lançamento.

Testes obrigatórios: convite sem autenticação não dá acesso à loja; contacto diferente rejeitado; prazo; reenvio invalida anterior; reuso e concorrência; isolamento entre lojas; permissões; contas existentes; login normal email/Google; novo login telefone; confirmação SMS; falha e reenvio; revogação de ajudantes; recuperar conta de convite expirado sem associar automaticamente outra loja. Verificar que tokens não são registados em analytics. Não há alterações de produção executadas por esta branch.
