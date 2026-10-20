# Verificação da versão 0.8.6

Data da correção: 20/10/2026. Catálogos e fixtures públicas de referência: 08/10/2026.

Resultado: **92 testes passaram, nenhum falhou e nenhum foi ignorado.** A suíte inclui edição e persistência de títulos, datas e descarte, o formato de mensagem em uma linha, além dos catálogos, permissões, migrações e preferências.

## Ajustar vídeo, catálogos e cabeçalho

- Edição disponível somente em **Opções → Ajustar vídeo**, com seleção de pasta e vídeo, título exibido, salvamento e restauração do padrão. O catálogo do chat e do ícone continua sem botões adicionais por vídeo.
- Títulos individuais por ID, salvos separadamente dos catálogos e com prioridade sobre o título automático e as correções incluídas. Conferidos após atualização, reinício, alteração do nome original no Drive e restauração, inclusive em pastas pessoais.
- Busca, ordenação, lista e mensagem inserida usam o título escolhido. Um popup já aberto acompanha a alteração; títulos com marcação HTML permanecem texto inerte.
- Rascunho ainda não salvo nas opções é preservado quando outro título muda; pastas vazias desabilitam as ações. Campos inválidos e tentativas de edição pela página do Opa! são rejeitados sem gravação.
- Edições simultâneas de dois títulos, atualização e alteração de favorito preservam todas as preferências.
- Os três JSONs enviados em 20/10/2026 foram incorporados, mantendo todos os títulos de exibição e links informados. A contagem de Integrações foi corrigida de 149 para 146, acompanhando a remoção dos três itens DELETAR.
- As quatro correções de Estoque que diferem do padrão automático ficam em `titleOverrides`; as demais correções de nomes são reproduzidas pela nova leitura de datas. Foram conferidas após leitura completa das fixtures públicas de Estoque.
- Reconhecimento de datas compactas ou separadas, incluindo `20102026` e `25/04/ 2025`, com validação do calendário e ano bissexto. Datas impossíveis e números comuns são mantidos; o nome original não é modificado.
- Marcações de descarte isoladas ou separadas, como DELETAR, APAGAR e PARA EXCLUIR, são ignoradas. Tutoriais sobre excluir/deletar e sobre o método DELETE da API são preservados.
- Seletor **Catálogo** no cabeçalho, ao lado de Atualizar e Opções, compartilhado entre o chat e o popup.
- Conferência adicional em Chromium 138.0.7204.0: seleção de pasta e vídeo, salvamento, recarga da página, atualização, restauração e busca no popup. Inspeção visual das opções e do cabeçalho, com controles alinhados e sem sobreposição no popup de 450 px.

## Mensagem em uma única linha

- Formato: `Sua mensagem: Assunto | Nome do vídeo - link`. Sem assunto, apenas o nome antes do separador do link.
- Mensagem personalizada sem dois-pontos recebe o separador; mensagem já terminada em dois-pontos não o duplica.
- Quebras existentes na mensagem personalizada ou no título são convertidas em espaços na composição, sem regravar as preferências.
- Prévia das opções, inserção pelo chat e composição do popup usam o mesmo formato.
- Leitura pelo evento `input` e leitura posterior como texto conferidas, incluindo mensagem personalizada, título e link, sem introdução e somente o link.
- Rascunho anterior e formatação preservados; inserções sucessivas acrescentam um espaço quando necessário, sem adicionar quebras.
- Inserção por texto nativo, sem `span`, estilos ou HTML adicionais. Falha ou recusa da operação nativa usa um nó de texto como alternativa. Títulos contendo marcação HTML permanecem texto inerte.
- A extensão continua sem disparar Enter, clicar em enviar ou chamar a API do Opa!.
- Conferência adicional em Chromium 138.0.7204.0, com editor sintético e os scripts reais: inserção pelo catálogo em uma única linha, sem elementos HTML adicionais, igualdade entre `innerText` e `textContent`, rascunho formatado preservado, um evento de entrada, duas inserções e nomes tratados como texto. Passaram os caminhos nativo, indisponível e com erro; desfazer e refazer passaram no caminho nativo. A leitura posterior para envio foi simulada apenas na página de teste.

## Preparação para GitHub

- Rodapé das opções no formato Versão 0.8.6 — GitHub, sem seção adicional ou texto explicativo. O link abre em nova aba com proteção noopener/noreferrer.
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

- Preservação dos links de **76 tutoriais de Fiscal**, **184 de Estoque**, **290 de Financeiro** e **146 de Integrações Gerais**.
- Consulta real das listagens públicas em 08/10/2026: uma pasta em Fiscal, três em Estoque, 33 em Financeiro e uma em Integrações Gerais. Em Estoque, 171 registros da raiz e 13 da subpasta de relatórios.
- Financeiro corrigido para a pasta principal **2026 Financeiro - Speed Videos Suporte**, ID `1PPy8Ny8J1WQbziEbVLF9JhZBUP1pTEDC`, com 290 registros em uma lista única. Os 31 tutoriais da subpasta Contratos continuam incluídos.
- Migração do catálogo de Contratos salvo na versão 0.5 para a nova pasta principal, sem acesso externo, inclusive antes do evento de instalação e ao iniciar o Chrome. Preservação dos outros catálogos, favoritos, mensagem, setor e desativação anterior; limpeza apenas da data de atualização do Financeiro.
- Catálogos já atualizados pela nova raiz permanecem intactos nos próximos reinícios. Salvamentos com a raiz antiga ou outra raiz são rejeitados; Contratos é consultado apenas depois de descoberto como subpasta da nova raiz.
- As duas pastas “Fora do contexto REVISAR ou REGRAVAR” e a pasta “Fora do contexto Helper Mídia - Integrações e API” foram identificadas e não foram consultadas.
- Integrações Gerais incluído como quarto setor no popup, no chat e nas opções. Sua listagem pública foi lida em 08/10/2026 e os 146 links elegíveis da raiz foram preservados; três itens DELETAR foram excluídos.
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
- Composição da inserção em uma linha: `Sua mensagem: Assunto | Nome do vídeo - link`.
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

As verificações automatizadas usaram **Node, jsdom e APIs do Chrome simuladas**. A edição também foi conferida em Chromium com uma página sintética, sem acessar atendimentos reais. O percurso completo foi conferido com cópias reais das listagens públicas obtidas em 08/10/2026. Novos vídeos, ciclos, falhas, pastas vazias e diferentes nomes excluídos foram simulados, sem modificar as pastas do Drive. A edição usa uma estrutura sintética baseada nos seletores do HTML fornecido; o HTML original e os dados dos clientes não estão no pacote.

O usuário já confirmou a pesquisa e a cópia de links da versão anterior durante atendimentos reais. Os fluxos de pastas pessoais, Integrações Gerais e a mensagem em uma linha foram conferidos em ambiente de teste; o envio no atendimento real ainda precisa ser validado no navegador em uso. Os prompts reais de permissão do Chrome não foram validados nos testes.

O conteúdo dos vídeos não foi assistido ou revisado. A verificação cobre catálogo e funcionamento do código, não a orientação técnica de cada vídeo.
