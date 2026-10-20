# Revisão de segurança — Opa! Speed Vídeos

Este documento descreve o código da versão **0.8.6** para facilitar a revisão da extensão. Não representa homologação ou aprovação da IXCSoft.

## Escopo

A extensão consulta listagens públicas de vídeos, oferece busca local e insere o link escolhido no rascunho do Opa! Suite. Não utiliza a API do Opa! nem implementa login corporativo ou OAuth do Google.

O usuário confirma o envio no próprio Opa!. O adaptador não dispara Enter, não clica no botão de envio e não executa uma chamada de envio de mensagem.

O projeto está em [https://github.com/a-v99/opa_speed_videos](https://github.com/a-v99/opa_speed_videos). A versão de instalação usa o mesmo código da raiz do repositório, sem minificação ou código gerado.

## Arquivos em execução

| Arquivo | O que faz | Pontos a revisar |
| --- | --- | --- |
| `manifest.json` | Declara páginas, worker e permissões. | Origens permitidas e ausência de permissão para todos os sites. |
| `background.js` | Registra o adaptador, lê/grava estado, migra catálogos e consulta o Drive. | Validação de remetentes, controle das subpastas, limites e uso de `credentials: "omit"`. |
| `core.js` | Valida URLs e catálogos; extrai títulos, pastas e arquivos da listagem; busca e monta a mensagem. | Restrições de URL, exclusões e análise do HTML remoto somente como dados. |
| `content.js` | Encontra o editor do atendimento, cria o botão/painel e acrescenta texto. | Origem exata, seletor do editor, detecção de troca de atendimento, preservação do rascunho e ausência de envio automático. |
| `view.js` | Pesquisa, favoritos, atualização e gestão das pastas pessoais. | Inserção de títulos como texto, validação das ações e destino dos links. |
| `popup.js` | Abre a busca pelo ícone; solicita inserção na aba ativa do Opa!. | Restrição da aba ao domínio do suporte. |
| `options.js` | Preferências, ativação/desativação, prévia e atualização individual. | Escrita das preferências e solicitações de acesso iniciadas por ação do usuário. |
| `popup.html`, `options.html` e arquivos CSS | Páginas e estilos locais. | Scripts carregados por arquivo local; link do GitHub aberto apenas por clique. |
| `catalog*.json` | Catálogos iniciais. | Dados: nomes, identificadores, caminhos e links de arquivos públicos; sem conteúdo dos vídeos. |

## Permissões

| Permissão | Uso |
| --- | --- |
| `storage` | Preferências, favoritos, catálogos, pastas pessoais, seleção e datas de atualização no perfil local. |
| `scripting` | Registrar/injetar o adaptador no endereço fixo do Opa!. |
| `clipboardWrite` | Copiar o link escolhido, após ação do usuário. |
| `https://suporte.ixcsoft.com.br/*` | Integração visual com o chat; o código verifica também protocolo e origem exata. |
| `https://drive.google.com/*`, opcional | Consulta das listagens públicas, solicitada ao atualizar ou adicionar uma pasta. |

O link do GitHub não exige permissão adicional: é um link comum em `options.html`, com `target="_blank"` e `rel="noopener noreferrer"`. O código não consulta a API do GitHub.

## Dados utilizados

| Dado | Origem e tratamento |
| --- | --- |
| Nomes, IDs e links dos vídeos | JSON incluído na extensão e visualização pública do Drive. São pesquisados localmente. |
| Pastas pessoais | Link e nome informados pelo usuário; catálogo salvo neste perfil. Remover retira os dados locais e não altera o Drive. |
| Favoritos e área selecionada | Identificadores salvos em `chrome.storage.local`. |
| Mensagem personalizada | Texto informado nas opções, salvo localmente e usado para compor o rascunho. |
| Títulos individuais | Mapa `videoTitles` em `chrome.storage.local`, por ID do vídeo. Tem prioridade na apresentação, busca e composição da mensagem, sem alterar arquivos do Drive. |
| Rascunho do atendimento | O adaptador lê o campo `#input_envio_msg` para acrescentar o texto no final e preservar o conteúdo existente. |
| Aba ativa | Usada para localizar um atendimento na origem permitida ao inserir pelo popup. |

O código não percorre o histórico de mensagens nem envia dados de clientes para um servidor próprio. Não há telemetria implementada, credenciais embutidas ou armazenamento de tokens.

## Consulta ao Drive

As requisições explícitas de consulta externa feitas pelo worker usam:

```text
https://drive.google.com/embeddedfolderview?id=ID_DA_PASTA#list
```

O `fetch` usa `credentials: "omit"`, `cache: "no-store"` e timeout de 20 segundos. A listagem é analisada para extrair dados dos links; o HTML recebido não é colocado no painel.

Títulos são apresentados por `textContent` e `createTextNode`. A mensagem é composta em uma única linha, com espaços entre o prefixo e o título e ` - ` entre o título e o link. Na inserção, o adaptador usa o comando nativo `insertText`, com um nó de texto inserido por `Range` como alternativa. Não insere elementos, estilos ou HTML na mensagem. Títulos e mensagens não são interpretados como código.

Os links **Abrir vídeo** e o link do repositório abrem a página de destino no navegador, por ação do usuário. Os serviços de destino têm seus próprios comportamentos de rede e compartilhamento.

As pastas privadas não são consultadas usando a sessão corporativa. O catálogo anterior é mantido se a consulta de uma pasta necessária falhar.

## Validações e limites

- Somente URLs HTTPS de arquivos e pastas do Google Drive no formato aceito.
- Rejeição de credenciais na URL, outros hosts, portas alternativas, registros inválidos e IDs duplicados.
- Pastas com nomes contendo **fora de contexto**, **fora do contexto** ou **regravar** são ignoradas junto com seus descendentes.
- Subpastas precisam ser descobertas durante a mesma consulta; a autorização interna expira em dez minutos.
- Limites por catálogo: 100 pastas, 5.000 vídeos e resposta de até 4.000.000 caracteres.
- Até 20 pastas pessoais, mensagem personalizada de até 2.000 caracteres e inserção de até 10.000 caracteres.
- Gravações de estado serializadas para preservar alterações simultâneas.
- Ações do worker limitadas às páginas da extensão ou ao frame principal do Opa! permitido.
- Configuração da origem e da mensagem personalizada alterável somente pelas páginas da extensão.
- Títulos individuais de 1 a 500 caracteres, com limite de 5.000 personalizações no perfil. Salvar e restaurar títulos só são permitidos a páginas da extensão; chamadas da página do Opa! são rejeitadas.
- As correções incluídas nos catálogos são reaplicadas pelo ID a cada atualização. Títulos individuais ficam separados dos catálogos e não são perdidos numa sincronização.
- Datas de nomes são aceitas apenas quando formam uma data válida em dia/mês/ano. Marcações de descarte são filtradas sem excluir tutoriais sobre operações de exclusão.

## Desenvolvimento e distribuição

`jsdom` e suas dependências são utilizados somente pelos testes. O lockfile registra versões, origem e integridade. Execute `npm ci --ignore-scripts` para instalar essas dependências.

`tests/fixtures/drive/` contém cópias sanitizadas de listagens públicas de 08/10/2026, reduzidas a títulos e links. Não contém o HTML do atendimento, imagens, scripts remotos ou credenciais. A suíte funciona sem consultar o Drive.

`scripts/package.py` usa uma lista explícita dos arquivos que entram no pacote da extensão. O pacote não inclui testes, dependências ou ferramentas de desenvolvimento.

O workflow do GitHub executa verificações, testes e empacotamento em um runner, com permissão de leitura do repositório. Não faz commit, push, publicação ou deploy.

## Verificar localmente

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run package
```

Confira também a ativação/desativação no Chrome, os prompts de acesso, a troca de atendimento, a preservação do rascunho e a inserção no editor real. Os testes simulam as APIs e o DOM e não substituem essa validação.

O registro dos testes está em [VERIFICACAO.md](VERIFICACAO.md).
