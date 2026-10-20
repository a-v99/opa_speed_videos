(() => {
  "use strict";
  const core = SpeedVideosCore;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  async function send(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok) throw new Error(response?.error || "Não foi possível acessar a extensão. Recarregue a página.");
    return response;
  }
  async function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const input = document.createElement("textarea");
    input.value = text; input.style.cssText = "position:fixed;left:-10000px;top:0;";
    document.body.appendChild(input); input.select();
    const copied = document.execCommand("copy"); input.remove();
    if (!copied) throw new Error("Não foi possível copiar o link neste navegador.");
  }
  async function readCatalogTree(areaId, progress = () => {}, pending = false) {
    const area = core.areaConfig(areaId);
    const queue = [{ folderId: area.folderId, path: area.label }];
    const seen = new Set([area.folderId]);
    const items = new Map();
    const folders = [];
    const ignoredFolders = [];
    let scanId;
    for (const folder of queue) {
      progress(`${area.label}: lendo ${folder.path} (${folders.length + 1}ª pasta)…`);
      let page;
      try {
        const response = await send({ type: "SV_FETCH_FOLDER", areaId: area.id, folderId: folder.folderId, scanId,
          ...(pending ? { personalFolder: area } : {}) });
        if (!scanId) scanId = response.scanId;
        page = core.parsePublicFolderPage(response.html, areaId);
      } catch (error) { throw new Error(`${folder.path}: ${error.message}`); }
      folders.push({ folderId: folder.folderId, path: folder.path });
      for (const item of page.items) {
        if (!items.has(item.id)) items.set(item.id, { ...item, folderId: folder.folderId, folderPath: folder.path });
        if (items.size > core.maxItems) throw new Error("O catálogo ultrapassa o limite de 5.000 vídeos.");
      }
      for (const child of page.folders) {
        const path = `${folder.path} / ${child.name}`;
        if (core.isIgnoredFolder(child.name)) { ignoredFolders.push({ ...child, path }); continue; }
        if (seen.has(child.folderId)) continue;
        if (seen.size >= core.maxFolders) throw new Error("A pasta ultrapassa o limite de 100 subpastas por atualização.");
        seen.add(child.folderId); queue.push({ folderId: child.folderId, path });
      }
    }
    return { ...core.catalogFromTree([...items.values()], area, folders, ignoredFolders), scanId };
  }
  async function addPersonalFolder(rawUrl, label, progress = () => {}) {
    const folder = core.personalFolderFromUrl(rawUrl, label);
    // Keep the permission request attached to the user's click.
    const permission = await send({ type: "SV_REQUEST_DRIVE" });
    if (!permission.granted) throw new Error("A consulta ao Drive não foi permitida. A pasta não foi adicionada.");
    const catalog = await readCatalogTree(folder, progress, true);
    return send({ type: "SV_ADD_FOLDER", folder, catalog, scanId: catalog.scanId });
  }
  async function refreshCatalogs(progress = () => {}) {
    // Send immediately from the click: the worker requests the optional permission.
    const permission = await send({ type: "SV_REQUEST_DRIVE" });
    if (!permission.granted) throw new Error("A consulta ao Drive não foi permitida. Os catálogos anteriores foram mantidos.");
    const before = (await send({ type: "SV_STATE" })).state;
    progress("Consultando setores e pastas pessoais…");
    const areas = before.areas || core.areas;
    const responses = await Promise.allSettled(areas.map((area) => readCatalogTree(area, progress)));
    const updated = [];
    const failed = [];
    for (const [index, area] of areas.entries()) {
      try {
        const response = responses[index];
        if (response.status === "rejected") throw response.reason;
        const catalog = response.value;
        const oldIds = new Set(before.catalogs[area.id].items.map((item) => item.id));
        const added = catalog.items.filter((item) => !oldIds.has(item.id)).length;
        // Writes are sequential; updating one area must not replace the other.
        await send({ type: "SV_SAVE_CATALOG", areaId: area.id, catalog, scanId: catalog.scanId });
        updated.push({ areaId: area.id, label: area.label, added, total: catalog.items.length,
          folders: catalog.folders.length, ignored: catalog.ignoredFolders.length });
      } catch (error) { failed.push({ areaId: area.id, label: area.label, error: error.message || "Não foi possível ler a pasta." }); }
    }
    return { state: (await send({ type: "SV_STATE" })).state, updated, failed };
  }
  function mount(container, options) {
    let state = options.state;
    let destroyed = false;
    const app = el("section", "sv-app");
    const header = el("header", "sv-header");
    const subtitle = el("div", "sv-subtitle");
    const heading = el("div"); heading.append(el("h2", "sv-title", "Speed Vídeos"), subtitle);
    const headerActions = el("div", "sv-header-actions");
    header.append(heading, headerActions);
    const refresh = el("button", "sv-btn sv-refresh", "Atualizar"); refresh.type = "button";
    refresh.title = "Buscar novos vídeos nos setores e nas suas pastas pessoais";
    refresh.addEventListener("click", () => {
      if (refresh.disabled) return;
      action(refresh, async () => {
        refresh.textContent = "Atualizando…"; refresh.setAttribute("aria-busy", "true");
        try {
          const result = await refreshCatalogs((message) => { if (!destroyed) status(message); });
          if (destroyed) return;
          applyState(result.state);
          const done = result.updated.map((area) => area.added
            ? `${area.label}: ${area.added} novo${area.added === 1 ? "" : "s"} vídeo${area.added === 1 ? "" : "s"} (${area.total} no total)`
            : `${area.label}: sem novos vídeos (${area.total} no total)`);
          const errors = result.failed.map((area) => `${area.label}: atualização falhou; catálogo anterior mantido. ${area.error}`);
          status([...done, ...errors].join(" · "), !!result.failed.length);
        } finally { refresh.textContent = "Atualizar"; refresh.removeAttribute("aria-busy"); }
      });
    });
    headerActions.append(refresh);
    const settings = el("button", "sv-btn", "Opções"); settings.type = "button";
    settings.addEventListener("click", () => send({ type: "SV_OPTIONS" }).catch((e) => status(e.message, true)));
    headerActions.append(settings);
    if (options.onClose) {
      const close = el("button", "sv-btn", "×"); close.type = "button";
      close.setAttribute("aria-label", "Fechar vídeos");
      close.addEventListener("click", options.onClose); headerActions.append(close);
    }
    const personal = el("details", "sv-personal");
    const personalSummary = el("summary", "", "Pastas pessoais");
    const personalBody = el("div", "sv-personal-body");
    const personalHint = el("p", "sv-personal-hint", "Adicione uma pasta pública do Drive para usar neste perfil. Remover daqui não altera os arquivos no Drive.");
    const folderForm = el("form", "sv-folder-form");
    const urlLabel = el("label"); urlLabel.append(el("span", "", "Link da pasta"));
    const folderUrl = el("input"); folderUrl.type = "url"; folderUrl.required = true; folderUrl.maxLength = 2000;
    folderUrl.placeholder = "https://drive.google.com/drive/folders/…";
    folderUrl.setAttribute("aria-label", "Link da pasta do Drive"); urlLabel.append(folderUrl);
    const nameLabel = el("label"); nameLabel.append(el("span", "", "Nome (opcional)"));
    const folderName = el("input"); folderName.type = "text"; folderName.maxLength = 100;
    folderName.placeholder = "Ex.: Materiais de outubro"; folderName.setAttribute("aria-label", "Nome da pasta pessoal"); nameLabel.append(folderName);
    const addFolder = el("button", "sv-btn sv-add-folder", "Adicionar e buscar"); addFolder.type = "submit";
    folderForm.append(urlLabel, nameLabel, addFolder);
    folderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (addFolder.disabled) return;
      const rawUrl = folderUrl.value;
      const label = folderName.value.trim() || `Pasta pessoal ${(state.personalFolders || []).length + 1}`;
      action(addFolder, async () => {
        addFolder.textContent = "Buscando…"; addFolder.setAttribute("aria-busy", "true");
        folderUrl.disabled = true; folderName.disabled = true;
        try {
          const result = await addPersonalFolder(rawUrl, label, (message) => { if (!destroyed) status(message); });
          if (destroyed) return;
          applyState(result.state); folderForm.reset(); personal.open = false;
          status(`Pasta ${label} adicionada: ${result.state.catalog.items.length} vídeos. Use Atualizar para buscar novidades.`);
          input.focus();
        } finally {
          addFolder.textContent = "Adicionar e buscar"; addFolder.removeAttribute("aria-busy");
          folderUrl.disabled = false; folderName.disabled = false;
        }
      });
    });
    const personalList = el("div", "sv-personal-list");
    personalBody.append(personalHint, folderForm, personalList); personal.append(personalSummary, personalBody);
    const controls = el("div", "sv-controls");
    const areaSwitch = el("label", "sv-sector"); areaSwitch.append(el("span", "", "Catálogo"));
    const areaSelect = el("select", "sv-sector-select"); areaSelect.setAttribute("aria-label", "Setor dos vídeos");
    areaSelect.addEventListener("change", () => {
      const areaId = areaSelect.value;
      if (areaId === (state.activeArea || "fiscal")) return;
      action(areaSelect, async () => {
        try {
          const result = await send({ type: "SV_SET_AREA", areaId });
          if (!destroyed) { applyState(result.state); input.focus(); }
        } finally { if (!destroyed) areaSelect.value = state.activeArea || "fiscal"; }
      });
    });
    areaSwitch.append(areaSelect);
    const input = el("input"); input.type = "search";
    input.setAttribute("aria-label", "Pesquisar vídeos");
    const filters = el("div", "sv-filters");
    const favoriteLabel = el("label", "sv-check");
    const favoriteOnly = el("input"); favoriteOnly.type = "checkbox";
    favoriteLabel.append(favoriteOnly, document.createTextNode("Favoritos"));
    filters.append(favoriteLabel);
    const messageLabel = el("label", "sv-check");
    const includeTitle = el("input"); includeTitle.type = "checkbox"; includeTitle.checked = true;
    messageLabel.append(includeTitle, document.createTextNode("Incluir mensagem e título ao inserir"));
    headerActions.prepend(areaSwitch);
    controls.append(input, filters, messageLabel);
    const counter = el("div", "sv-counter"); counter.setAttribute("aria-live", "polite");
    const list = el("div", "sv-list"); list.setAttribute("aria-label", "Resultados da pesquisa");
    const feedback = el("p", "sv-status"); feedback.setAttribute("role", "status");
    app.append(header, personal, controls, counter, list, feedback); container.append(app);
    function status(message, error = false) { feedback.textContent = message; feedback.dataset.error = String(error); }
    function areaControls() {
      const area = selectedArea();
      subtitle.textContent = area.subtitle; input.placeholder = area.placeholder;
      const sectors = el("optgroup"); sectors.label = "Setores do suporte";
      for (const sector of core.areas) sectors.append(new Option(sector.label, sector.id));
      areaSelect.replaceChildren(sectors);
      const folders = state.personalFolders || [];
      if (folders.length) {
        const group = el("optgroup"); group.label = "Pastas pessoais";
        for (const folder of folders) group.append(new Option(folder.label, folder.id));
        areaSelect.append(group);
      }
      areaSelect.value = area.id;
      personalSummary.textContent = folders.length ? `Pastas pessoais (${folders.length})` : "Adicionar pasta do Drive";
      personalList.replaceChildren();
      for (const folder of folders) {
        const row = el("div", "sv-personal-row");
        const info = el("div"); info.append(el("span", "sv-personal-name", folder.label),
          el("span", "sv-personal-count", `${state.catalogs[folder.id]?.items.length || 0} vídeos`));
        const remove = el("button", "sv-btn sv-remove-folder", "Remover"); remove.type = "button";
        remove.setAttribute("aria-label", `Remover pasta ${folder.label}`);
        remove.addEventListener("click", () => action(remove, async () => {
          const result = await send({ type: "SV_REMOVE_FOLDER", areaId: folder.id });
          if (!destroyed) { applyState(result.state); status(`Pasta ${folder.label} removida do seu catálogo. Os arquivos no Drive foram preservados.`); }
        }));
        row.append(info, remove); personalList.append(row);
      }
    }
    function selectedArea() { return core.areaConfig(state.activeArea || "fiscal", state.personalFolders || []); }
    function applyState(next) {
      if (destroyed) return;
      const switched = (next.activeArea || "fiscal") !== (state.activeArea || "fiscal");
      state = next;
      if (switched) { input.value = ""; favoriteOnly.checked = false; }
      areaControls(); render();
      if (switched) status(`Catálogo de ${selectedArea().label} selecionado.`);
    }
    async function action(button, work) {
      button.disabled = true;
      try { await work(); } catch (error) { status(error.message, true); }
      finally { button.disabled = false; }
    }
    function render() {
      if (destroyed) return;
      const results = core.search(state.catalog.items, input.value, "", favoriteOnly.checked, state.favorites);
      counter.textContent = `${results.length} de ${state.catalog.items.length} vídeos`;
      list.replaceChildren();
      if (!results.length) { list.append(el("div", "sv-empty", "Nenhum vídeo encontrado. Tente outro termo ou assunto.")); return; }
      const fragment = document.createDocumentFragment();
      for (const item of results) {
        const card = el("article", "sv-card");
        const top = el("div", "sv-card-top");
        const star = el("button", "sv-star", state.favorites.includes(item.id) ? "★" : "☆");
        star.type = "button"; star.setAttribute("aria-label", `Favoritar ${item.displayTitle || item.title}`);
        star.setAttribute("aria-pressed", String(state.favorites.includes(item.id)));
        star.addEventListener("click", () => action(star, async () => {
          const result = await send({ type: "SV_FAVORITE", id: item.id }); state.favorites = result.favorites; render();
        }));
        top.append(el("h3", "", item.displayTitle || item.title), star);
        const date = item.dateInFilename ? item.dateInFilename.split("-").reverse().join("/") : null;
        const meta = el("p", "sv-meta", date || "");
        const actions = el("div", "sv-actions");
        const insert = el("button", "sv-btn sv-primary", "Inserir no chat"); insert.type = "button";
        insert.addEventListener("click", () => action(insert, async () => {
          await options.onInsert(core.messageFor(item, includeTitle.checked, state.introduction ?? core.defaultIntroduction));
          status("Adicionado ao rascunho. Revise a mensagem e envie pelo Opa!.");
        }));
        const copy = el("button", "sv-btn", "Copiar link"); copy.type = "button";
        copy.addEventListener("click", () => action(copy, async () => { await copyText(item.url); status("Link copiado."); }));
        const open = el("a", "sv-link", "Abrir vídeo"); open.href = item.url; open.target = "_blank"; open.rel = "noopener noreferrer";
        actions.append(insert, copy, open); card.append(top, meta);
        if (item.folderPath && item.folderPath !== selectedArea().label) {
          card.append(el("p", "sv-meta sv-folder", item.folderPath));
        }
        card.append(actions); fragment.append(card);
      }
      list.append(fragment);
    }
    input.addEventListener("input", render); favoriteOnly.addEventListener("change", render);
    areaControls(); render();
    status(state.opaOrigin ? "Escolha um vídeo para inserir ou copiar." : "Ative a integração com o Opa! em Opções para inserir no chat.");
    function changed(values, area) {
      if (area !== "local" || destroyed || !(values.favorites || values.catalog || values.catalogs || values.activeArea || values.personalFolders || values.opaOrigin || values.introduction || values.videoTitles)) return;
      send({ type: "SV_STATE" }).then((result) => applyState(result.state)).catch((error) => status(error.message, true));
    }
    chrome.storage.onChanged.addListener(changed);
    return { focus: () => input.focus(), status,
      destroy: () => { destroyed = true; chrome.storage.onChanged.removeListener(changed); app.remove(); } };
  }
  globalThis.SpeedVideosView = { mount, send, copyText, readCatalogTree, refreshCatalogs, addPersonalFolder };
})();
