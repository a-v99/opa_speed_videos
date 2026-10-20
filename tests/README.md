# Testes

Execute na raiz do repositório, com Node.js 22 ou superior:

```sh
npm ci --ignore-scripts
npm run check
npm test
```

A suíte usa `jsdom`, APIs do Chrome simuladas e dados fictícios para testar o adaptador. Nenhum teste envia mensagens no Opa! ou modifica o Drive.

Os catálogos, as pastas pessoais, a busca, a composição da mensagem, as permissões e as migrações são conferidos, incluindo falhas, duplicação e manutenção dos favoritos. A inserção confere o formato em uma única linha no evento `input` e numa leitura posterior para envio, além da ausência de HTML inserido, preservação do rascunho e tratamento de nomes como texto.

`fixtures/drive/` contém as listagens públicas de referência de 08/10/2026, sanitizadas para manter apenas títulos e links em HTML. Das 699 entradas originais, 696 são elegíveis após ignorar os três itens DELETAR de Integrações. A leitura completa é comparada com os catálogos; pastas excluídas não são consultadas. Imagens, scripts, estilos externos e o HTML de atendimentos não são incluídos.

Os testes de títulos usam a página de opções conectada ao worker simulado. Conferem pasta e vídeo selecionados, salvamento, busca e inserção usando o novo nome, atualização com o popup aberto, persistência após atualizar/reiniciar, restauração do padrão, pastas pessoais, limites e rejeição de chamadas externas. Datas válidas e marcações de descarte são testadas separadamente de números comuns e tutoriais sobre exclusão.

Para usar outro conjunto de listagens, defina `SPEEDVIDEOS_TREE_INDEX` com o caminho do índice JSON. Os caminhos `file` das pastas podem ser absolutos ou relativos ao diretório desse índice.

As variáveis opcionais `SPEEDVIDEOS_FOLDER_HTML` e `SPEEDVIDEOS_STOCK_HTML` podem apontar para listagens de referência compatíveis para conferir individualmente as raízes de Fiscal e Estoque.

Essas verificações não substituem o teste da extensão instalada no Chrome e a validação do editor real do Opa!.
