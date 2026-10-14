# Testes

Execute na raiz do repositório, com Node.js 22 ou superior:

```sh
npm ci --ignore-scripts
npm run check
npm test
```

A suíte usa `jsdom`, APIs do Chrome simuladas e dados fictícios para testar o adaptador. Nenhum teste envia mensagens no Opa! ou modifica o Drive.

Os catálogos, as pastas pessoais, a busca, a composição da mensagem, as permissões e as migrações são conferidos, incluindo falhas, duplicação e manutenção dos favoritos.

`fixtures/drive/` contém as listagens públicas de referência de 08/10/2026, sanitizadas para manter apenas títulos e links em HTML. Os 699 registros dos quatro setores são comparados com o resultado da leitura completa; pastas excluídas não são consultadas. Imagens, scripts, estilos externos e o HTML de atendimentos não são incluídos.

Para usar outro conjunto de listagens, defina `SPEEDVIDEOS_TREE_INDEX` com o caminho do índice JSON. Os caminhos `file` das pastas podem ser absolutos ou relativos ao diretório desse índice.

As variáveis opcionais `SPEEDVIDEOS_FOLDER_HTML` e `SPEEDVIDEOS_STOCK_HTML` podem apontar para listagens de referência compatíveis para conferir individualmente as raízes de Fiscal e Estoque.

Essas verificações não substituem o teste da extensão instalada no Chrome e a validação do editor real do Opa!.
