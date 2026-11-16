# Configurar o Google para o motor (uma vez só)

O motor usa o MESMO projeto do Google Cloud do site (a Drive API já está ativa lá). Falta criar um cliente do tipo "Aplicativo para computador".

1. Abra https://console.cloud.google.com/apis/credentials e confira que o projeto do site está selecionado no topo.
2. Clique em **Criar credenciais > ID do cliente OAuth**.
3. Em **Tipo de aplicativo**, escolha **App para computador** (Desktop app). Nome: `Toxic Music Engine`. Clique em **Criar**.
4. Clique em **Fazer o download do JSON**. Salve o arquivo com o nome `google-cliente.json` dentro da pasta `dados` do motor.
5. Se a tela de consentimento estiver em modo "Teste", o seu e-mail precisa estar na lista de usuários de teste (já está, por causa do site).
6. Dê dois cliques em `1-entrar-google.bat`, abra o link que aparecer, escolha a conta e clique em Permitir.

## Cuidados
- O arquivo `google-cliente.json` e o `google-token.json` ficam só no seu PC, na pasta `dados` (fora do GitHub). Nunca envie para ninguém nem cole em conversa.
- Para cancelar o acesso: `3-desconectar-google.bat`. Também dá para remover em https://myaccount.google.com/permissions
- Com a tela de consentimento em modo "Teste", o Google costuma cancelar o acesso depois de 7 dias. Quando isso acontecer, o motor avisa e você roda `1-entrar-google.bat` de novo.
- Escopos usados: leitura do Drive (para ver a biblioteca) e `drive.file` (só os arquivos que o próprio motor cria). O motor nunca apaga nada.
