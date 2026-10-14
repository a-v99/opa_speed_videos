# Verificação da versão 0.8.3

Data da preparação para GitHub: 14/10/2026. Catálogos e fixtures públicas de referência: 08/10/2026.

Base de regressão: **79 testes passaram na versão 0.8.2, nenhum falhou.** Na versão 0.8.3, foram conferidos o rodapé, o link, as versões e o empacotamento. O código JavaScript de execução permanece igual ao da base de regressão.

## Preparação para GitHub

- Rodapé das opções no formato Versão 0.8.3 — GitHub, sem seção adicional ou texto explicativo. O link abre em nova aba com proteção noopener/noreferrer.
- Manifesto na raiz, README, licença MIT, orientações de contribuição e documentação para revisão arquivo por arquivo.
- Dependências de teste e lockfile na raiz, scripts de verificação e empacotamento e workflow para verificar alterações no GitHub.
- Fixtures públicas sanitizadas com caminhos relativos, permitindo executar a suíte sem conexão com o Drive.
- ZIP de instalação gerado por lista explícita de arquivos, sem testes, dependências e ferramentas de desenvolvimento.
- Nenhum commit, push ou publicação foi realizado durante esta preparação.

## Endereço e permissões

- Endereço fixo `https://suporte.ixcsoft.com.br`, sem preenchimento manual.
- Ativação automática na instalação e restauração do registro ao iniciar o Chrome.
- Migração de endereço antigo sem perder catálogos, favoritos ou o setor escolhido.
- Preservação de uma desativação explícita anterior.
- Rejeição de HTTP, outras origens, portas alternativas e credenciais na URL.
- Acesso obrigatório apenas ao Opa! definido; acesso opcional apenas ao Drive. `activeTab` removido.
- Respeito à recusa do acesso ao Opa! e recuperação quando o acesso volta a ser concedido.
- Configuração do Opa! e mensagem personalizada alteráveis somente pelas páginas da extensão. Atualização e gestão de pastas pessoais no chat limitadas ao Opa! definido e ao frame principal.

## Pastas pessoais

- Inclusão pelo link de uma pasta pública do Drive, com nome opcional, leitura completa e seleção automática do novo catálogo.
- Aceitação de links normais e links com /u/0/, parâmetros de compartilhamento e barra final.
- Rejeição de links de arquivos, outros sites, HTTP, portas alternativas e URLs com credenciais.
- Consulta das subpastas com as mesmas exclusões, deduplicação de vídeos, prevenção de ciclos e busca pelo caminho.
- Rejeição de pasta duplicada, inclusive quando o link vem em outro formato, e de raiz já incluída num setor fixo.
- Adição sem login; acesso privado, resposta de login, recusa de permissão ou falha em subpasta não salvam catálogos incompletos.
- Pasta pública vazia permitida e preenchida numa atualização posterior.
- Atualizar inclui os setores fixos e as pastas pessoais; uma falha preserva o catálogo anterior daquela pasta.
- Remoção retira a definição, catálogo e data local de atualização. Não há operação de alteração ou exclusão no Drive.
- A remoção de uma pasta selecionada volta ao Fiscal. Remover outra pasta mantém o setor selecionado.
- Atualizações antigas não recriam pastas removidas nem sobrescrevem uma nova inclusão do mesmo link.
- Preservação de favoritos, mensagem individual e outros catálogos. Pastas pessoais persistem nos reinícios e atualizações da extensão; ficam isoladas entre perfis.
- Rejeição de subpastas não descobertas, raízes inconsistentes, solicitações de fora da extensão/Opa! e chamadas do chat desativado.
- Formulário, grupo no dropdown, cópia, remoção, texto sem execução de HTML, inserção com rascunho preservado e atualização individual nas opções conferidos com a interface conectada ao worker simulado.
- Permissões do manifesto preservadas: Opa! fixo e Drive opcional. Sem autenticação corporativa, telemetria ou servidor adicional.

## Catálogos e subpastas

- Preservação dos links de **76 tutoriais de Fiscal**, **184 de Estoque**, **290 de Financeiro** e **149 de Integrações Gerais**.
- Consulta real das listagens públicas em 08/10/2026: uma pasta em Fiscal, três em Estoque, 33 em Financeiro e uma em Integrações Gerais. Em Estoque, 171 registros da raiz e 13 da subpasta de relatórios.
- Financeiro corrigido para a pasta principal **2026 Financeiro - Speed Videos Suporte**, ID `1PPy8Ny8J1WQbziEbVLF9JhZBUP1pTEDC`, com 290 registros em uma lista única. Os 31 tutoriais da subpasta Contratos continuam incluídos.
- Migração do catálogo de Contratos salvo na versão 0.5 para a nova pasta principal, sem acesso externo, inclusive antes do evento de instalação e ao iniciar o Chrome. Preservação dos outros catálogos, favoritos, mensagem, setor e desativação anterior; limpeza apenas da data de atualização do Financeiro.
- Catálogos já atualizados pela nova raiz permanecem intactos nos próximos reinícios. Salvamentos com a raiz antiga ou outra raiz são rejeitados; Contratos é consultado apenas depois de descoberto como subpasta da nova raiz.
- As duas pastas “Fora do contexto REVISAR ou REGRAVAR” e a pasta “Fora do contexto Helper Mídia - Integrações e API” foram identificadas e não foram consultadas.
- Integrações Gerais incluído como quarto setor no popup, no chat e nas opções. Sua listagem pública foi lida em 08/10/2026 e os 149 links da raiz foram preservados.
- Setas e datas iniciais separadas por barras verticais são retiradas do título de exibição, mantendo assunto, título completo, data e nome original para busca.
- A atualização da versão 0.7 mantém as pastas pessoais e as preferências. Uma raiz de Integrações já cadastrada como pessoal é convertida em setor fixo, inclusive antes dos eventos de instalação, preservando catálogo e data, favoritos, seleção, outras pastas e desativação anterior.
- Um catálogo fixo existente prevalece; um pessoal vazio usa o catálogo inicial. Atualização de Integrações, exclusão da subpasta, novo vídeo simulado e inserção da mensagem no popup foram conferidos.
- Doze PDFs da pasta de modelos de O.S. não entram na lista de vídeos.
- Percurso recursivo com exclusão de nomes contendo “fora de contexto”, “fora do contexto” ou “regravar”, em qualquer nível, ignorando maiúsculas e acentos.
- Deduplicação de vídeos e prevenção de ciclos e de novas consultas à mesma pasta.
- Aceitação de subpastas vazias válidas.
- Rejeição de subpastas não descobertas na mesma consulta, de setores diferentes ou excluídas pela regra de nomes.
- Preservação do catálogo inteiro do setor se uma subpasta necessária falhar; possibilidade de atualizar o outro setor.
- Atualização manual, contagem de IDs novos e manutenção de favoritos, pesquisa e setor selecionado.
- Rejeição de respostas vazias, pedidos de login, links fora do Drive e catálogos inválidos.
- Requisições ao Drive sem credenciais Google e sem baixar o conteúdo dos vídeos.

## Interface e mensagem

- Cabeçalhos de todos os vídeos no popup e no chat em Assunto | Nome quando existe um assunto no arquivo; sem assunto, apenas o nome.
- Títulos reduzidos de 14 para 13 px, com quebra de linha para nomes longos. A linha abaixo mostra a data, sem repetir o assunto.
- Tipo documento é exibido como Tipo de documento no título e na mensagem. Os arquivos e links originais são preservados.
- Seletor dropdown de setor no menu do chat e no ícone da extensão.
- Financeiro incluído no seletor e nas opções, sem substituir os catálogos existentes ou a mensagem personalizada de instalações anteriores.
- Filtro de assuntos removido do menu do chat e do ícone; busca por palavras limitada ao setor selecionado.
- Setor organizado inteiramente em subpastas conferido por simulação, com lista única, busca por query e exclusão de regravar.
- Troca de setor com limpeza dos filtros e manutenção dos favoritos.
- Busca com acentos, múltiplas palavras, assuntos, siglas e nomes das subpastas.
- Mensagem personalizada salva localmente, com prévia tratada como texto e limite de 2.000 caracteres.
- Composição da inserção: mensagem personalizada, `Assunto | Nome do vídeo` e link.
- Preservação dos assuntos do Fiscal ao compor a mensagem, com a padronização de Tipo documento para Tipo de documento.
- Prefixos do Financeiro entre colchetes reconhecidos sem truncar o nome do vídeo.
- Mensagem vazia permitida; opção de inserir somente o link mantida.
- Aplicação de uma mensagem recém-salva mesmo com o menu do chat aberto.
- Inserção ao final do rascunho existente, preservando texto e formatação.
- Edição nativa sem duplicação e emissão de um evento de entrada quando necessário.
- Preservação do campo separado de rascunho da IA.
- Ausência de evento de Enter, clique no botão de envio ou chamada à API do Opa!.
- Substituição do campo de atendimento sem duplicar o botão.
- Tratamento de títulos como texto e bloqueio de inserção em outra origem.

As verificações automatizadas usaram **Node, jsdom e APIs do Chrome simuladas**. O percurso completo foi conferido com cópias reais das listagens públicas obtidas em 08/10/2026. Novos vídeos, ciclos, falhas, pastas vazias e diferentes nomes excluídos foram simulados, sem modificar as pastas do Drive. A edição usa uma estrutura sintética baseada nos seletores do HTML fornecido; o HTML original e os dados dos clientes não estão no pacote.

O usuário já confirmou a pesquisa e a cópia de links da versão anterior durante atendimentos reais. Os novos fluxos de pastas pessoais e Integrações Gerais foram conferidos em ambiente simulado; ainda precisam ser experimentados nesta versão no navegador em uso. Os prompts reais de permissão do Chrome não foram validados nos testes.

O conteúdo dos vídeos não foi assistido ou revisado. A verificação cobre catálogo e funcionamento do código, não a orientação técnica de cada vídeo.
