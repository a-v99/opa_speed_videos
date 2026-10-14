# Opa! — Speed Vídeos

Extensão para Chrome que reúne os vídeos de suporte de **Fiscal**, **Estoque**, **Financeiro** e **Integrações Gerais**. Permite pesquisar, favoritar, copiar links e acrescentar uma mensagem ao rascunho de um atendimento no Opa! Suite.

**Repositório:** [a-v99/opa_speed_videos](https://github.com/a-v99/opa_speed_videos)  
**Versão:** 0.8.3  
**Licença do código:** [MIT](LICENSE)

O código JavaScript da extensão é distribuído diretamente, sem minificação, compilação ou dependências em execução. Projeto independente para uso no suporte, sem publicação na Chrome Web Store ou homologação como produto da IXCSoft.

## Instalação pelo código-fonte

1. Clone o repositório ou baixe e extraia o ZIP do GitHub:

```sh
git clone https://github.com/a-v99/opa_speed_videos.git
cd opa_speed_videos
```

2. Abra `chrome://extensions` e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a raiz desta pasta, onde está `manifest.json`.
4. Abra ou recarregue um atendimento em [https://suporte.ixcsoft.com.br](https://suporte.ixcsoft.com.br).
5. Use o botão **Vídeos** no chat ou fixe o ícone da extensão na barra do navegador.

Não é necessário instalar Node, npm ou Python para usar a extensão. Mantenha a pasta carregada no mesmo caminho. Para atualizar uma instalação existente e preservar favoritos e preferências, substitua os arquivos na mesma pasta, recarregue a extensão e recarregue o Opa!.

## Funcionalidades

- Busca por palavras no setor ou pasta pessoal selecionada, ignorando acentos e maiúsculas.
- Títulos em **Assunto | Nome**; sem assunto no arquivo, apenas o nome.
- Favoritos, mensagem personalizada e preferências salvos no perfil local do Chrome.
- Atualização manual de pastas públicas do Drive e suas subpastas.
- Exclusão de pastas com **fora de contexto**, **fora do contexto** ou **regravar** no nome, incluindo todos os descendentes.
- Até 20 pastas pessoais, além dos quatro setores fixos.
- Inserção ao final do rascunho, com revisão e envio pelo atendente.
- Link deste repositório na página **Opções**, para consulta, modificações e revisão técnica.

Pesquisa e cópia funcionam pelo ícone mesmo com a integração do chat desativada. O acesso ao Drive é opcional e solicitado ao atualizar ou adicionar uma pasta. A consulta usa listagens públicas, sem login Google.

Os catálogos incluídos são uma cópia de **08/10/2026**, com 76 registros de Fiscal, 184 de Estoque, 290 de Financeiro e 149 de Integrações Gerais. Clique em **Atualizar** para buscar mudanças. O pacote contém nomes e links; os vídeos permanecem no Drive.

Veja o [guia de uso](LEIA-ME.md) para instalação, configuração e detalhes dos catálogos.

## Desenvolvimento e testes

Para desenvolvimento, use **Node.js 22 ou superior** e npm:

```sh
npm ci --ignore-scripts
npm run check
npm test
```

`npm ci` usa as versões e integridades registradas em `package-lock.json`. A única dependência direta é `jsdom`, usada nos testes. Nenhuma dependência npm é necessária para executar a extensão.

`npm run check` confere a sintaxe, os arquivos necessários, os catálogos e a consistência das versões. `npm test` executa a suíte local com APIs do Chrome simuladas e fixtures públicas sanitizadas, sem consultar as pastas reais ou enviar mensagens.

Os testes cobrem catálogo, busca, exclusões, migrações, permissões, favoritos, pastas pessoais e preservação do rascunho. O comportamento do editor e dos prompts reais do Chrome deve ser validado também no navegador em uso.

Após uma alteração, clique em **Recarregar** em `chrome://extensions` e recarregue a página do Opa!. Não há etapa de compilação.

## Gerar um ZIP de instalação

Com **Python 3** instalado:

```sh
npm run package
```

Também é possível executar `python3 scripts/package.py`, ou `py scripts/package.py` no Windows. O arquivo é criado em `dist/opa-speedvideos-v0.8.3.zip`, com os arquivos da extensão, o guia de uso e a licença. Dependências, testes, fixtures e ferramentas de desenvolvimento ficam fora desse ZIP.

Ao preparar uma nova versão, atualize `manifest.json`, `package.json`, `package-lock.json` e o rodapé de `options.html`. O empacotador lê a versão do manifesto.

## Estrutura e revisão

| Arquivo ou pasta | Finalidade |
| --- | --- |
| `manifest.json` | Configuração da extensão e permissões. |
| `background.js` | Armazenamento, migrações, permissões, registro do adaptador e consulta ao Drive. |
| `content.js` | Botão no chat, painel e inserção no editor do Opa!. |
| `core.js` | Validação dos links, organização dos dados, busca e composição da mensagem. |
| `view.js` e `view.css` | Interface compartilhada entre popup e chat. |
| `popup.*` | Menu aberto pelo ícone da extensão. |
| `options.*` | Configuração da integração, mensagem, atualização e link do repositório. |
| `catalog*.json` | Nomes e links públicos dos vídeos incluídos inicialmente. |
| `tests/` | Testes e dados públicos de referência, sem o HTML de atendimentos reais. |
| `scripts/` | Verificação local e criação do ZIP. |
| `docs/` | Revisão de segurança e registro das verificações. |
| `.github/workflows/check.yml` | Verificação e testes em pushes e pull requests, sem publicar ou alterar o repositório. |

Para a análise arquivo por arquivo, comece por [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md). Todos os scripts executados pela extensão estão na raiz do repositório e entram no ZIP de instalação sem transformação.

## Contribuições e licença

O código está sob licença **MIT**. É possível clonar, adaptar e distribuir suas modificações, mantendo o aviso de licença. As orientações para contribuir estão em [CONTRIBUTING.md](CONTRIBUTING.md).

Os vídeos, marcas e demais materiais externos referenciados pertencem a seus respectivos responsáveis; a licença do código não concede direitos sobre esses conteúdos. As dependências de desenvolvimento mantêm suas próprias licenças.
