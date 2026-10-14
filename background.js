"use strict";
importScripts("core.js");
const core = SpeedVideosCore;
const scriptId = "speedvideos-opa-chat";
const bundledCatalogs = new Map();
const scans = new Map();
let styleText;
let changes = Promise.resolve();
let personalFoldersMigrated = false;
function serial(action) {
  const next = changes.then(action);
  changes = next.catch(() => {});
  return next;
}
function bundledCatalog(area) {
  if (!bundledCatalogs.has(area.id)) bundledCatalogs.set(area.id, fetch(chrome.runtime.getURL(area.bundledFile))
    .then((response) => response.json()).then((raw) => core.validateCatalog(raw, area.id)));
  return bundledCatalogs.get(area.id);
}
function isLegacyFinance(catalog) {
  return catalog?.source?.folderId === core.legacyFinanceFolderId;
}
async function migrateFinanceCatalog() {
  const stored = await chrome.storage.local.get(["catalogs", "lastSyncByArea"]);
  if (!isLegacyFinance(stored.catalogs?.financeiro)) return;
  const catalog = await bundledCatalog(core.areaConfig("financeiro"));
  await chrome.storage.local.set({ catalogs: { ...stored.catalogs, financeiro: catalog },
    lastSyncByArea: { ...stored.lastSyncByArea, financeiro: null } });
}
async function migrateBundledPersonalFolders() {
  if (personalFoldersMigrated) return;
  const stored = await chrome.storage.local.get(["personalFolders", "catalogs", "lastSyncByArea", "activeArea"]);
  const rawFolders = stored.personalFolders || [];
  const promoted = rawFolders.filter((folder) => core.areas.some((area) => area.folderId === folder.folderId));
  if (!promoted.length) { personalFoldersMigrated = true; return; }
  const remaining = core.validatePersonalFolders(rawFolders.filter((folder) => !promoted.includes(folder)));
  const catalogs = { ...stored.catalogs };
  const lastSyncByArea = { ...stored.lastSyncByArea };
  let activeArea = stored.activeArea || "fiscal";
  for (const input of promoted) {
    const folder = core.validatePersonalFolder(input);
    const area = core.areas.find((candidate) => candidate.folderId === folder.folderId);
    if (!catalogs[area.id]) {
      const previous = catalogs[folder.id];
      if (previous?.items?.length) {
        const validated = core.validateCatalog(previous, folder);
        const path = (value) => typeof value === "string" && (value === folder.label || value.startsWith(folder.label + " /"))
          ? area.label + value.slice(folder.label.length) : value;
        catalogs[area.id] = core.validateCatalog({ ...validated, areaId: area.id,
          source: { ...validated.source, name: area.sourceName, url: area.folderUrl },
          items: validated.items.map((item) => item.folderPath === undefined ? item : { ...item, folderPath: path(item.folderPath) }),
          folders: validated.folders?.map((entry) => ({ ...entry, path: path(entry.path) })),
          ignoredFolders: validated.ignoredFolders?.map((entry) => ({ ...entry, path: path(entry.path) })) }, area);
        lastSyncByArea[area.id] = stored.lastSyncByArea?.[folder.id] || null;
      } else {
        catalogs[area.id] = await bundledCatalog(area);
        lastSyncByArea[area.id] = null;
      }
    }
    delete catalogs[folder.id]; delete lastSyncByArea[folder.id];
    if (activeArea === folder.id) activeArea = area.id;
  }
  await chrome.storage.local.set({ personalFolders: remaining, catalogs, lastSyncByArea, activeArea });
  personalFoldersMigrated = true;
}
async function getState() {
  const stored = await chrome.storage.local.get(["catalog", "catalogs", "favorites", "opaOrigin", "lastSync", "lastSyncByArea", "activeArea", "introduction", "personalFolders"]);
  const personalFolders = core.validatePersonalFolders(stored.personalFolders);
  const areas = [...core.areas, ...personalFolders];
  const catalogs = Object.fromEntries(await Promise.all(core.areas.map(async (area) => {
    // Version 0.1 stored its fiscal catalog under "catalog". Keep that data on update.
    const local = stored.catalogs?.[area.id] || (area.id === "fiscal" && stored.catalog);
    if (local && !(area.id === "financeiro" && isLegacyFinance(local))) return [area.id, core.validateCatalog(local, area.id)];
    return [area.id, await bundledCatalog(area)];
  })));
  for (const folder of personalFolders) catalogs[folder.id] = core.validateCatalog(stored.catalogs?.[folder.id], folder);
  const activeArea = areas.some((area) => area.id === stored.activeArea) ? stored.activeArea : "fiscal";
  const lastSyncByArea = { fiscal: stored.lastSync || null, ...stored.lastSyncByArea };
  if (isLegacyFinance(stored.catalogs?.financeiro)) lastSyncByArea.financeiro = null;
  if (!styleText) styleText = fetch(chrome.runtime.getURL("view.css")).then((response) => response.text());
  return { catalog: catalogs[activeArea], catalogs, areas, personalFolders, activeArea, favorites: stored.favorites || [],
    opaOrigin: stored.opaOrigin === "" ? "" : core.opaOrigin,
    introduction: typeof stored.introduction === "string" ? core.validateIntroduction(stored.introduction) : core.defaultIntroduction,
    lastSync: lastSyncByArea[activeArea] || null, lastSyncByArea, css: await styleText };
}
async function configuredArea(id) {
  const stored = await chrome.storage.local.get("personalFolders");
  return core.areaConfig(id, core.validatePersonalFolders(stored.personalFolders));
}
function assertNewFolder(folder, personalFolders) {
  const existing = [...core.areas, ...personalFolders].find((area) => area.folderId === folder.folderId);
  if (existing) throw new Error(`Esta pasta já está no catálogo: ${existing.label}.`);
  if (personalFolders.length >= core.maxPersonalFolders) throw new Error("Você pode cadastrar até 20 pastas pessoais. Remova uma para adicionar outra.");
}
function assertPersonalScan(area, scanId) {
  const scan = scans.get(scanId);
  if (!scan || scan.areaId !== area.id || scan.area.folderId !== area.folderId
    || Date.now() - scan.started > 600000 || !scan.completed.has(area.folderId)) {
    throw new Error("A consulta desta pasta expirou ou foi removida. Consulte a pasta novamente.");
  }
  return scan;
}
async function unregister() {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [scriptId] });
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
}
async function disableOldTabs(origin) {
  if (!origin) return;
  const tabs = await chrome.tabs.query({ url: core.originPattern(origin) });
  await Promise.allSettled(tabs.map((tab) => chrome.tabs.sendMessage(tab.id, { type: "SV_DISABLE" })));
}
async function register(origin, inject = true) {
  await unregister();
  if (!origin) return;
  if (origin !== core.opaOrigin) throw new Error("Esta extensão funciona somente no suporte da IXCSoft.");
  const pattern = core.opaPattern;
  if (!await chrome.permissions.contains({ origins: [pattern] })) return;
  await chrome.scripting.registerContentScripts([{ id: scriptId, matches: [pattern],
    js: ["core.js", "view.js", "content.js"], runAt: "document_idle", persistAcrossSessions: true }]);
  if (inject) {
    const tabs = await chrome.tabs.query({ url: pattern });
    await Promise.allSettled(tabs.filter((tab) => { try { return new URL(tab.url).origin === origin; } catch { return false; } })
      .map((tab) => chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["core.js", "view.js", "content.js"] })));
  }
}
async function initializeOrigin(inject = true) {
  await migrateFinanceCatalog();
  await migrateBundledPersonalFolders();
  const { opaOrigin: previous } = await chrome.storage.local.get("opaOrigin");
  // New installs activate automatically. Retain an explicit prior disable.
  const origin = previous === "" ? "" : core.opaOrigin;
  if (previous && previous !== origin) await disableOldTabs(previous);
  await chrome.storage.local.set({ opaOrigin: origin });
  await register(origin, inject);
}
async function dispatch(message) {
  switch (message.type) {
    case "SV_STATE": return { ok: true, state: await getState() };
    case "SV_SET_AREA": return serial(async () => {
      const area = await configuredArea(message.areaId);
      await chrome.storage.local.set({ activeArea: area.id });
      return { ok: true, state: await getState() };
    });
    case "SV_SET_MESSAGE": return serial(async () => {
      const introduction = core.validateIntroduction(message.introduction);
      await chrome.storage.local.set({ introduction });
      return { ok: true, introduction };
    });
    case "SV_SET_ORIGIN": return serial(async () => {
      const origin = message.origin ? core.normalizeOpaUrl(message.origin) : "";
      if (origin && origin !== core.opaOrigin) {
        throw new Error("O endereço do Opa! é fixo: https://suporte.ixcsoft.com.br.");
      }
      if (origin && !await chrome.permissions.contains({ origins: [core.opaPattern] })) {
        throw new Error("Permita o acesso ao endereço do Opa! para ativar o botão.");
      }
      const old = (await chrome.storage.local.get("opaOrigin")).opaOrigin;
      await disableOldTabs(old);
      await chrome.storage.local.set({ opaOrigin: origin });
      await register(origin);
      return { ok: true, origin };
    });
    case "SV_FAVORITE": return serial(async () => {
      const state = await getState();
      if (!Object.values(state.catalogs).some((catalog) => catalog.items.some((item) => item.id === message.id))) throw new Error("Vídeo não encontrado.");
      const favorites = new Set(state.favorites);
      favorites.has(message.id) ? favorites.delete(message.id) : favorites.add(message.id);
      await chrome.storage.local.set({ favorites: [...favorites] });
      return { ok: true, favorites: [...favorites] };
    });
    case "SV_FETCH_FOLDER": {
      let area;
      if (message.personalFolder) {
        area = core.validatePersonalFolder(message.personalFolder);
        if (area.id !== message.areaId) throw new Error("Pasta pessoal inválida.");
        const stored = await chrome.storage.local.get("personalFolders");
        assertNewFolder(area, core.validatePersonalFolders(stored.personalFolders));
      } else area = await configuredArea(message.areaId);
      if (!await chrome.permissions.contains({ origins: ["https://drive.google.com/*"] })) {
        throw new Error("Permita a consulta à pasta pública do Google Drive para atualizar.");
      }
      const folderId = message.folderId || area.folderId;
      let scanId = message.scanId;
      let scan;
      if (folderId === area.folderId) {
        const now = Date.now();
        for (const [id, entry] of scans) if (now - entry.started > 600000) scans.delete(id);
        while (scans.size >= 32) scans.delete(scans.keys().next().value);
        scanId = crypto.randomUUID();
        scan = { areaId: area.id, area, started: now, allowed: new Set([area.folderId]), completed: new Set() }; scans.set(scanId, scan);
      } else {
        scan = scans.get(scanId);
        if (!scan || scan.areaId !== area.id || Date.now() - scan.started > 600000 || !scan.allowed.has(folderId)) {
          throw new Error("A subpasta não pertence a esta atualização. Clique em Atualizar para tentar novamente.");
        }
      }
      const folderFeed = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
      const response = await fetch(folderFeed, { credentials: "omit", cache: "no-store",
        signal: AbortSignal.timeout(20000) });
      if (!response.ok || !response.url.startsWith("https://drive.google.com/")) {
        throw new Error("A pasta pública não respondeu. O catálogo anterior foi mantido.");
      }
      const html = await response.text();
      if (html.length > 4000000) throw new Error("A resposta da pasta é grande demais para esta versão.");
      for (const folder of core.foldersInHtml(html)) {
        if (core.isIgnoredFolder(folder.name)) continue;
        scan.allowed.add(folder.folderId);
        if (scan.allowed.size > core.maxFolders) throw new Error("A pasta ultrapassa o limite de 100 subpastas por atualização.");
      }
      scan.completed.add(folderId);
      return { ok: true, html, folderId, scanId };
    }
    case "SV_SAVE_CATALOG": return serial(async () => {
      const area = await configuredArea(message.areaId);
      if (area.personal) assertPersonalScan(area, message.scanId);
      const { scanId: unused, ...raw } = message.catalog;
      const catalog = core.validateCatalog(raw, area);
      const stored = await chrome.storage.local.get(["catalogs", "lastSyncByArea"]);
      await chrome.storage.local.set({ catalogs: { ...stored.catalogs, [area.id]: catalog },
        lastSyncByArea: { ...stored.lastSyncByArea, [area.id]: new Date().toISOString() } });
      return { ok: true, state: await getState() };
    });
    case "SV_ADD_FOLDER": return serial(async () => {
      const folder = core.validatePersonalFolder(message.folder);
      const stored = await chrome.storage.local.get(["personalFolders", "catalogs", "lastSyncByArea"]);
      const personalFolders = core.validatePersonalFolders(stored.personalFolders);
      assertNewFolder(folder, personalFolders);
      assertPersonalScan(folder, message.scanId);
      const { scanId: unused, ...raw } = message.catalog;
      const catalog = core.validateCatalog(raw, folder);
      await chrome.storage.local.set({ personalFolders: [...personalFolders, folder],
        catalogs: { ...stored.catalogs, [folder.id]: catalog },
        lastSyncByArea: { ...stored.lastSyncByArea, [folder.id]: new Date().toISOString() }, activeArea: folder.id });
      scans.delete(message.scanId);
      return { ok: true, state: await getState() };
    });
    case "SV_REMOVE_FOLDER": return serial(async () => {
      const stored = await chrome.storage.local.get(["personalFolders", "catalogs", "lastSyncByArea", "activeArea"]);
      const personalFolders = core.validatePersonalFolders(stored.personalFolders);
      const folder = personalFolders.find((candidate) => candidate.id === message.areaId);
      if (!folder) throw new Error("Somente pastas pessoais podem ser removidas.");
      const catalogs = { ...stored.catalogs }; delete catalogs[folder.id];
      const lastSyncByArea = { ...stored.lastSyncByArea }; delete lastSyncByArea[folder.id];
      await chrome.storage.local.set({ personalFolders: personalFolders.filter((candidate) => candidate.id !== folder.id),
        catalogs, lastSyncByArea, activeArea: stored.activeArea === folder.id ? "fiscal" : stored.activeArea || "fiscal" });
      for (const [id, scan] of scans) if (scan.areaId === folder.id) scans.delete(id);
      return { ok: true, state: await getState() };
    });
    case "SV_OPTIONS": await chrome.runtime.openOptionsPage(); return { ok: true };
    default: throw new Error("Ação desconhecida.");
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message?.type?.startsWith("SV_")) return false;
  const extensionPage = sender.url?.startsWith(chrome.runtime.getURL(""));
  let senderOrigin; try { senderOrigin = new URL(sender.url).origin; } catch { senderOrigin = ""; }
  const opaPage = senderOrigin === core.opaOrigin && Number.isInteger(sender.tab?.id) && sender.frameId === 0;
  if (!extensionPage && !opaPage) {
    respond({ ok: false, error: "Abra o menu da extensão ou um atendimento em https://suporte.ixcsoft.com.br." }); return false;
  }
  if (message.type === "SV_REQUEST_DRIVE") {
    // Do not await storage or network before requesting: retain the originating click.
    try {
      chrome.permissions.request({ origins: ["https://drive.google.com/*"] })
        .then((granted) => respond({ ok: true, granted }), () => respond({ ok: false,
          error: "Autorize a primeira consulta pelo botão Atualizar no ícone da extensão. Os catálogos foram mantidos." }));
    } catch {
      respond({ ok: false, error: "Abra o ícone da extensão e clique em Atualizar para autorizar o Drive." });
    }
    return true;
  }
  if (["SV_SET_ORIGIN", "SV_SET_MESSAGE"].includes(message.type) && !extensionPage) {
    respond({ ok: false, error: "Abra as opções da extensão para realizar essa ação." }); return false;
  }
  (async () => {
    if (["SV_FETCH_FOLDER", "SV_SAVE_CATALOG", "SV_ADD_FOLDER", "SV_REMOVE_FOLDER"].includes(message.type) && !extensionPage) {
      const { opaOrigin } = await chrome.storage.local.get("opaOrigin");
      if (opaOrigin === "") {
        throw new Error("Ative a integração com o Opa! nas opções para atualizar pelo chat.");
      }
    }
    if (!personalFoldersMigrated) await serial(migrateBundledPersonalFolders);
    return dispatch(message);
  })().then(respond, (error) => respond({ ok: false, error: error.message || "Não foi possível concluir a ação." }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => serial(() => initializeOrigin()).catch(console.error));
chrome.runtime.onStartup.addListener(() => serial(() => initializeOrigin(false)).catch(console.error));
chrome.permissions.onAdded.addListener(({ origins }) => {
  if (origins?.includes(core.opaPattern)) return serial(() => initializeOrigin()).catch(console.error);
});
chrome.permissions.onRemoved.addListener(() => {
  serial(async () => {
    const { opaOrigin } = await chrome.storage.local.get("opaOrigin");
    if (opaOrigin !== "" && !await chrome.permissions.contains({ origins: [core.opaPattern] })) {
      await disableOldTabs(core.opaOrigin);
      await unregister();
    }
  }).catch(console.error);
});
