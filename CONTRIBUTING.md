# Contribuindo

Você pode fazer um fork ou clonar [a-v99/opa_speed_videos](https://github.com/a-v99/opa_speed_videos) e adaptar o código, conforme a licença MIT.

## Trabalhar numa alteração

1. Crie uma branch para sua alteração.
2. Modifique os arquivos da raiz. O código é JavaScript, HTML e CSS, sem compilação.
3. Instale as dependências de desenvolvimento com `npm ci --ignore-scripts`.
4. Execute `npm run check` e `npm test`.
5. Recarregue a extensão no Chrome e teste o comportamento alterado. Para preservar seus favoritos, mantenha a mesma pasta carregada.
6. Descreva o problema, a mudança e o que foi verificado no pull request.

Para gerar o pacote de instalação, execute `npm run package`, com Python 3 instalado.

## Pontos do código

- `core.js`: setores, origens das pastas, validação, títulos e busca.
- `view.js` e `view.css`: menus compartilhados, cartões e ações.
- `content.js`: seletores do editor, observação da página e inserção no rascunho.
- `background.js`: persistência, migrações, validação dos remetentes e consulta pública.
- `options.html`, `options.js` e `options.css`: preferências do usuário.
- `tests/verify.cjs`: cenários automatizados com dados fictícios e listagens públicas de referência.

Inclua testes para mudanças de comportamento ou correções relevantes. Ajustes simples de texto e estilo podem ser conferidos na interface e na suíte existente.

## Compatibilidade e versões

As preferências e catálogos são guardados em `chrome.storage.local`. Preserve os formatos existentes ou implemente uma migração quando mudar os dados persistidos.

Os quatro setores fixos convivem com pastas pessoais. Uma nova raiz fixa pode já estar cadastrada como pessoal; use o mecanismo de migração existente para evitar duplicação.

Ao mudar uma versão de distribuição, mantenha a versão do manifesto, do pacote npm e do rodapé das opções iguais. Atualize o lockfile com `npm install --package-lock-only --ignore-scripts`.

## Revisão técnica

Qualquer ampliação de permissões, acesso a outra origem ou autenticação deve ser descrita claramente na alteração e em [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md).

Reproduza problemas do editor com dados fictícios. As fixtures de `tests/fixtures/drive/` contêm apenas títulos e links públicos, sem imagens, scripts ou conteúdo de atendimentos.
