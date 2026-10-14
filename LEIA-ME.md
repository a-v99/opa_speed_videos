# Opa! — Speed Vídeos · 0.8.3

Extensão para Chrome com os setores **Fiscal**, **Estoque**, **Financeiro** e **Integrações Gerais**, além de **pastas pessoais do Drive**. Pesquisa os vídeos das pastas e subpastas de cada setor e acrescenta o link ao rascunho do atendimento no Opa! Suite.

O endereço já está definido: **https://suporte.ixcsoft.com.br**. Não é necessário copiar ou configurar a URL.

## Atualizar a versão já instalada

1. Extraia este ZIP e substitua os arquivos dentro da **mesma pasta `opa-speedvideos` que você carregou no Chrome**.
2. Em `chrome://extensions`, clique no botão **Recarregar** da extensão Speed Vídeos.
3. Recarregue também a página do Opa!.

Manter a mesma pasta permite conservar os favoritos, a mensagem personalizada e a última área escolhida. Os catálogos salvos de Fiscal e Estoque são preservados. Na atualização da versão 0.5, o catálogo do Financeiro limitado a Contratos é substituído automaticamente pelo catálogo completo da pasta principal, já incluído neste pacote; não é necessário autorizar o Drive para essa migração. Os 31 links de Contratos continuam incluídos e seus favoritos são mantidos. A data de atualização do Financeiro é limpa, pois se referia à pasta anterior. Atualizações já salvas com a nova pasta principal são preservadas.

O endereço antigo do Opa!, quando existia, é substituído pelo endereço fixo. Se você tinha desativado explicitamente a integração nas opções, ela permanece desativada; use **Ativar no Opa!** para retomá-la. Carregar a extensão de outro caminho pode criar uma instalação separada.

## Instalar

1. Extraia o ZIP em uma pasta que você possa manter no computador.
2. No Chrome, abra `chrome://extensions` e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta `opa-speedvideos`, que contém `manifest.json`.
4. Abra ou recarregue um atendimento em **https://suporte.ixcsoft.com.br**. A integração é ativada automaticamente na instalação; o botão **Vídeos** deve aparecer junto às ações do campo de mensagem.
5. Se preferir, fixe o ícone da extensão na barra do navegador para abrir o catálogo também por ali.

Se você instalou pelo GitHub, selecione a raiz da pasta clonada, onde está o manifest.json. A pasta precisa continuar no mesmo lugar enquanto a extensão estiver instalada dessa forma. Esta versão é um pacote para teste, sem publicação na Chrome Web Store.

## Usar

- Escolha um setor ou uma **pasta pessoal** no seletor **Catálogo**, no topo do menu. Setores e pastas pessoais ficam em grupos separados. O mesmo dropdown aparece no ícone da extensão.
- O último setor escolhido é lembrado. Ao trocar, a pesquisa e o filtro de favoritos são limpos para mostrar os vídeos do novo setor.
- Clique em **Atualizar**, no topo do menu, para buscar os vídeos das pastas e subpastas dos setores e das suas pastas pessoais. Ao concluir, a extensão informa quantos vídeos novos encontrou em cada setor. O botão também está disponível no ícone da extensão.
- Pesquise por uma ou mais palavras. A busca ignora maiúsculas e acentos.
- Marque os vídeos mais usados como favoritos. O filtro de assuntos foi retirado da interface; palavras como **query** pesquisam apenas no catálogo do setor selecionado, incluindo os nomes das subpastas.
- **Inserir no chat** acrescenta a mensagem ao final do rascunho, preservando o texto existente. A opção **Incluir mensagem e título ao inserir** pode ser desmarcada para acrescentar somente o link.
- Em **Opções → Mensagem ao inserir o vídeo**, personalize o texto e clique em **Salvar mensagem**. A prévia mostra a composição final. A mensagem é individual, fica salva no perfil do Chrome e vale para todos os setores. Deixar o campo vazio mantém o título e o link, com o assunto quando informado no arquivo. **Restaurar padrão** preenche o texto original; clique em **Salvar mensagem** para confirmar.
- Revise o rascunho e envie pelo próprio Opa!. A extensão não aciona o envio.
- **Copiar link** copia a URL do vídeo; **Abrir vídeo** permite conferir o conteúdo antes de compartilhar.
- O catálogo também funciona pelo ícone da extensão. Para inserir por esse caminho, a aba ativa precisa ser um atendimento em **https://suporte.ixcsoft.com.br**, com a integração ativa.

Se o botão não aparecer, confira se você está no endereço acima, recarregue a página e abra um atendimento. Nas opções, **Ativar no Opa!** também permite restabelecer a integração e solicitar o acesso ao endereço se ele tiver sido bloqueado no Chrome. Você ainda pode pesquisar e copiar os links pelo ícone da extensão.

Com mensagem e título habilitados, o formato inserido é:

```text
Sua mensagem personalizada
Assunto | Nome do vídeo
https://drive.google.com/file/d/ID_DO_VIDEO/view
```

Os cartões do popup e do menu do chat exibem **Assunto | Nome do vídeo** em todos os setores e nas pastas pessoais, com títulos de **13 px**. Se o nome original do arquivo não trouxer um assunto, o cartão e a mensagem inserida mostram **somente o nome**, sem acrescentar o setor como assunto. A data fica abaixo do título, quando disponível.

No Fiscal, o assunto e o nome seguem o texto do arquivo, retirando o indicador de conferência, a data inicial reconhecida e a extensão de vídeo. O assunto abreviado **Tipo documento** é exibido como **Tipo de documento**, inclusive na mensagem inserida; o nome original continua pesquisável. Prefixos entre colchetes do Financeiro, como `[Contratos | Descontos]`, são identificados como assunto e aparecem antes do nome do vídeo. Outros nomes de assuntos mantêm o formato extraído do arquivo.

## Conteúdo e atualização

### Pastas pessoais

1. No menu do chat ou no ícone da extensão, abra **Adicionar pasta do Drive**, logo abaixo do cabeçalho com **Atualizar**. Quando já existem pastas extras, esse controle se chama **Pastas pessoais**.
2. Cole o link de uma **pasta pública do Google Drive**. Você pode dar um nome, como **Materiais de outubro**; sem nome, a extensão usa **Pasta pessoal 1**, **Pasta pessoal 2**, etc.
3. Clique em **Adicionar e buscar**. A extensão solicita o mesmo acesso opcional ao Drive usado na atualização e percorre a pasta e todas as subpastas permitidas. O catálogo só é salvo depois da leitura completa.
4. A pasta aparece no grupo **Pastas pessoais** do seletor e já fica selecionada. Seus vídeos aparecem numa lista única, com busca, favoritos, cópia e inserção como nos setores.
5. O botão **Atualizar** passa a consultar essa pasta também, buscando novos vídeos, renomeações e remoções.
6. Para deixar de usar uma pasta, abra **Pastas pessoais** e clique em **Remover** ao lado dela. A pasta sai do seletor, seus dados de catálogo são retirados do navegador e deixa de ser consultada. **Os arquivos e permissões no Drive não são alterados.** Se ela estava selecionada, a extensão volta ao Fiscal. É possível adicionar o mesmo link novamente depois.

As pastas pessoais ficam apenas neste perfil do Chrome; não são distribuídas aos colegas nem sincronizadas entre perfis. Permanecem salvas ao recarregar a extensão na mesma pasta e ao reiniciar o navegador. Os setores fixos não podem ser removidos por essa lista. Uma pasta já cadastrada ou uma raiz dos setores fixos não pode ser adicionada novamente. Vídeos repetidos dentro da mesma árvore aparecem uma única vez.

As mesmas exclusões de subpastas se aplicam: nomes contendo **fora de contexto**, **fora do contexto** ou **regravar** fazem a extensão ignorar a pasta e todos os seus descendentes. Pastas privadas não são consultadas usando sua conta Google; a leitura acontece sem autenticação. Se uma pasta necessária não puder ser lida, a adição não é concluída ou o catálogo anterior é mantido durante uma atualização. Uma pasta pública vazia pode ser adicionada e receber vídeos numa atualização futura.

É possível cadastrar até **20 pastas pessoais**, além dos setores fixos. Cada catálogo aceita até 100 pastas e 5.000 vídeos, dentro do espaço disponível no armazenamento da extensão. Nenhuma nova permissão foi acrescentada nesta versão.

### Setores incluídos

Os catálogos iniciais foram consultados em **08/10/2026** e incluem as pastas públicas e suas subpastas permitidas.

**Fiscal: 76 vídeos.** Pasta:

https://drive.google.com/drive/folders/19eincFNoNqrJajk3ez8Pn-_-8mBg0fZ8

O título exibido pelo Drive é **2026 Fiscal - Speed Videos Suporte**. Foram encontrados 77 arquivos na raiz e uma subpasta. Um arquivo de modelo de nomenclatura foi excluído; a subpasta **Fora do contexto REVISAR ou REGRAVAR - Fiscal** foi ignorada pela regra de nomes. Os vídeos de Query Builder presentes nesta mesma pasta estão incluídos. A outra pasta de Query e a wiki fiscal estão fora do escopo desta versão.

**Estoque: 184 registros de tutoriais.** Pasta fornecida para esse setor:

https://drive.google.com/drive/folders/1Is02Ons_d8KJ4n_C7E48zHLUgoIu8jhp

O título exibido no Drive é **Conf. Ordens de Serviço / Atendimentos / Processos**. O seletor usa o nome **Estoque**, conforme solicitado, e o subtítulo identifica o conteúdo da pasta. Foram incluídos os 171 registros da raiz e mais 13 tutoriais da subpasta **Relatórios Query Biulder**. A pasta **Modelos de O.S Padrão** foi percorrida, mas seus 12 PDFs não entram no catálogo de vídeos. A subpasta **Fora do contexto REVISAR ou REGRAVAR - O.S** foi ignorada. Doze tutoriais não têm extensão visível no nome e foram mantidos sem presumir o formato.

A exclusão vale em todos os níveis: qualquer pasta cujo nome contenha **fora de contexto**, **fora do contexto** ou **regravar** é ignorada, junto com todos os seus descendentes. A comparação ignora maiúsculas, acentos e diferenças de espaçamento entre essas palavras. Um nome contendo apenas **revisar** não é excluído por essa regra.

**Financeiro: 290 registros de tutoriais.** Pasta principal:

https://drive.google.com/drive/folders/1PPy8Ny8J1WQbziEbVLF9JhZBUP1pTEDC

O Drive identifica esta pasta como **2026 Financeiro - Speed Videos Suporte**. Foram percorridas 33 pastas, contando a principal, sem falhas na consulta. O catálogo inclui Contratos (31 tutoriais), Contas a pagar, Contas a receber, Conciliação Bancária, Query Builder, Relatórios e a Biblioteca de vídeos do Cadu, entre outras categorias. As subpastas da biblioteca também foram percorridas, inclusive o nível adicional de Etiqueta Anatel. Não foram encontrados nomes de pastas excluídos pela regra nesta árvore. O atualizador também aceita setores cujos vídeos estejam inteiramente em subpastas, sem exigir vídeos na raiz.

**Integrações Gerais: 149 registros de tutoriais.** Pasta:

https://drive.google.com/drive/folders/1XPkYMIMtJJm1B0Wp2PMLwx5Wa_vYZ_LK

O Drive identifica a pasta como **2026 Integrações/API/Franquia - Speed Videos Suporte**. Os 149 arquivos da raiz foram incluídos. A subpasta **Fora do contexto Helper Mídia - Integrações e API** foi ignorada pela mesma regra aplicada aos outros setores. A busca encontra termos como API, SVA, Central do Assinante, CRM e webhooks.

Os nomes com seta e data entre separadores, como `➡ | 07/10/2026 | Integrações | SVA | Nome do vídeo`, são tratados para exibir e inserir `Integrações | SVA | Nome do vídeo`; a data continua na identificação do cartão e o nome original continua pesquisável. Os arquivos sem extensão visível foram mantidos. Há três registros com “DELETAR” no nome, também mantidos: a exclusão solicitada se aplica às pastas, não a esses nomes de arquivos. O conteúdo dos vídeos não foi revisado.

Se você já adicionou esta raiz como pasta pessoal na versão 0.7, a atualização a transforma no setor fixo **Integrações Gerais**, sem duplicar o catálogo ou perder favoritos. O catálogo local e sua data de atualização são preservados quando existem vídeos válidos, assim como as outras pastas pessoais, a mensagem e a desativação da integração com o Opa!. Se a pasta convertida estava selecionada, Integrações Gerais permanece selecionado. Clique em **Atualizar** para reler a pasta completa.

Todos os vídeos do setor aparecem em uma lista única, independentemente da subpasta. O caminho da pasta continua visível nos cartões e participa da pesquisa.

No menu de vídeos, **Atualizar** consulta Fiscal, Estoque, Financeiro, Integrações Gerais e as suas pastas pessoais em um clique. A lista é atualizada sem apagar os favoritos ou trocar o setor selecionado. A mensagem de resultado mostra o número de registros novos comparando os IDs dos arquivos com os catálogos salvos. O catálogo é relido por inteiro, então renomeações e remoções também aparecem na lista atualizada.

Na primeira consulta, permita o acesso ao Google Drive quando o Chrome solicitar. Se o navegador não mostrar a solicitação dentro do chat, abra o ícone da extensão e clique em **Atualizar** para autorizar. Nas próximas consultas, o botão no chat reutiliza a permissão. Mantenha o menu aberto até concluir; o resultado só é salvo quando todas as subpastas necessárias desse setor forem lidas.

Nas opções, é possível escolher o **Setor ou pasta pessoal para atualizar** e clicar em **Atualizar vídeos da pasta** para consultar a pasta e as subpastas desse setor. A atualização de um setor preserva os demais. A consulta usa a visualização pública das pastas, sem autenticação e sem baixar o conteúdo dos vídeos. Se uma pasta ou subpasta necessária falhar ou não retornar uma listagem válida, o catálogo anterior inteiro desse setor é mantido; os outros setores podem ser atualizados normalmente. Pastas vazias válidas são aceitas. IDs repetidos são contados uma vez e atalhos circulares não são percorridos novamente.

Cada atualização aceita até 100 pastas e 5.000 vídeos por setor, com limite de 20 segundos para cada resposta do Drive. Ao exceder um limite, mantém o catálogo anterior. O código do worker autoriza subpastas somente quando elas foram descobertas na mesma consulta a um setor fixo ou pasta pessoal validada; não aceita subpastas não descobertas ou excluídas.

**A atualização é manual nesta versão.** A leitura depende do formato da página pública do Drive, que pode mudar. Para uma sincronização automática mais robusta, o próximo passo é usar a API oficial do Drive com uma estratégia de acesso definida pela empresa.

Títulos, assuntos, datas e marcas de verificação vieram dos nomes dos arquivos. As datas não representam necessariamente criação ou atualização no Drive. Os vídeos não foram assistidos nem tiveram o conteúdo técnico validado. Antes de enviar, confira se o link está acessível ao cliente e se o vídeo se aplica à dúvida.

## Integração e privacidade

- O endereço do Opa! é fixo: **https://suporte.ixcsoft.com.br**. As opções não têm campo para informar outro endereço.
- O manifesto declara acesso obrigatório somente a `https://suporte.ixcsoft.com.br/*`, para acrescentar o botão ao campo de mensagem. A execução do adaptador verifica também o protocolo, a origem exata e a porta. Não há permissão para todos os sites, subdomínios ou páginas HTTP.
- O acesso a `https://drive.google.com/*` é opcional e solicitado quando você clica para atualizar os vídeos ou adicionar uma pasta pessoal. A consulta não usa as credenciais da conta Google.
- A permissão `activeTab` foi removida. O código consulta a aba ativa, mas só insere quando ela corresponde ao endereço fixo do Opa!.
- Favoritos, última área escolhida, mensagem personalizada, pastas pessoais e catálogos ficam no armazenamento local do perfil do Chrome. Não há telemetria ou servidor próprio.
- A extensão não consulta histórico de conversas nem envia dados de clientes. Ao inserir, verifica apenas o campo de rascunho para acrescentar o texto.
- A extensão não usa a API do Opa!: adiciona uma interface local à página e edita o campo de mensagem já existente.
- Não contém credenciais, tokens, chave de API ou o HTML original do atendimento fornecido para análise.
- Para retirar a integração, use **Desativar no Opa!** nas opções ou remova a extensão.

## Validação e limites

O adaptador foi escrito a partir do HTML fornecido: campo `#input_envio_msg[contenteditable="true"]` e a primeira seção de ações dentro de `.message-sender-toolbar`. Um observador acompanha substituições do campo e da barra durante a navegação do aplicativo.

Você já confirmou a pesquisa e a cópia de links em atendimentos reais. Os novos fluxos de pastas pessoais e a inclusão de Integrações Gerais foram conferidos em ambiente simulado. O HTML permite identificar os elementos, mas não contém todos os comportamentos do aplicativo em execução. Se o Opa! tiver tratamento específico de edição ou mudar a estrutura da página, o adaptador pode precisar de ajuste. A edição usa a operação nativa de texto do navegador quando disponível, com um complemento que dispara o evento de entrada; o envio permanece manual.

Compatibilidade inicial: Chrome 106 ou superior. Outros navegadores baseados em Chromium podem funcionar, mas não foram testados. Esta extensão é um projeto independente, sem publicação ou homologação como produto da IXCSoft.

## Código-fonte e contribuições

O repositório está disponível em https://github.com/a-v99/opa_speed_videos e também aparece nas opções da extensão. Para clonar, modificar ou revisar o projeto, consulte o README.md. A documentação da revisão de segurança está em docs/SECURITY-REVIEW.md.

## Arquivos

- `manifest.json`: configuração e permissões da extensão.
- `background.js`: armazenamento, permissões e registro do adaptador.
- `content.js`: botão, painel e inserção no campo do Opa!.
- `core.js`: catálogo, busca e validação dos links.
- `view.js` e `view.css`: interface compartilhada entre o painel e o ícone da extensão.
- `popup.*`: catálogo aberto pelo ícone do Chrome.
- `options.*`: ativação/desativação no endereço fixo do Opa! e atualização manual da pasta.
- `catalog.json`: cópia inicial dos nomes e links do Fiscal.
- `catalog-estoque.json`: cópia inicial dos nomes e links da pasta identificada como Estoque.
- `catalog-financeiro.json`: cópia inicial dos nomes e links da pasta principal do Financeiro e suas subpastas.
- `catalog-integracoes.json`: cópia inicial dos nomes e links da pasta de Integrações Gerais.

Não há dependências externas, compilação ou `npm install` necessários para instalar a extensão.
