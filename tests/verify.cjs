"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");
const source = (name) => fs.readFileSync(path.join(root, name), "utf8");
const initialCatalog = JSON.parse(source("catalog.json"));
const stockCatalog = JSON.parse(source("catalog-estoque.json"));
const financeCatalog = JSON.parse(source("catalog-financeiro.json"));
const integrationsCatalog = JSON.parse(source("catalog-integracoes.json"));
const legacyFinanceFolderId = "1XGAO6zAHm89SjydOFn5VucEI4msZIoYg";
const contractItems = financeCatalog.items.filter((item) => item.folderId === legacyFinanceFolderId);
const clone = (value) => JSON.parse(JSON.stringify(value));
const origin = "https://suporte.ixcsoft.com.br";
const opaPattern = `${origin}/*`;
const extensionId = "test-speedvideos";
const extensionBase = `chrome-extension://${extensionId}/`;
function eventHook() {
  const listeners = new Set();
  return { listeners, addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn),
    emit: (...args) => { for (const fn of [...listeners]) fn(...args); } };
}
function coreContext() {
  const context = vm.createContext({ URL, console }); vm.runInContext(source("core.js"), context);
  return context.SpeedVideosCore;
}
function workerHarness(initialStored = {}) {
  const stored = clone(initialStored);
  const allowed = new Set(JSON.parse(source("manifest.json")).host_permissions || []);
  const registered = new Map();
  const injections = [];
  const messages = [];
  const network = [];
  const permissionRequests = [];
  let permissionGranted = true;
  let folderResponse = { ok: false, url: "https://drive.google.com/embeddedfolderview", text: async () => "" };
  const folderResponses = new Map();
  const hooks = { messages: eventHook(), storage: eventHook() };
  const tabs = [ { id: 1, url: `${origin}/chat` }, { id: 2, url: `${origin}:8443/chat` },
    { id: 3, url: "https://other.example/chat" } ];
  const chrome = {
    runtime: { id: extensionId, getURL: (name) => extensionBase + name, onMessage: hooks.messages,
      onInstalled: eventHook(), onStartup: eventHook(), openOptionsPage: async () => {} },
    permissions: { request: (request) => {
      permissionRequests.push(clone(request));
      if (permissionGranted) request.origins.forEach((p) => allowed.add(p));
      return Promise.resolve(permissionGranted);
    }, contains: async ({ origins }) => origins.every((p) => allowed.has(p)),
      remove: async ({ origins }) => { origins.forEach((p) => allowed.delete(p)); return true; }, onRemoved: eventHook(), onAdded: eventHook() },
    storage: { local: { get: async (keys) => {
      const selected = typeof keys === "string" ? [keys] : keys;
      return Object.fromEntries(selected.filter((key) => key in stored).map((key) => [key, clone(stored[key])]));
    }, set: async (values) => {
      const changes = {};
      for (const [key, value] of Object.entries(values)) {
        changes[key] = { oldValue: stored[key], newValue: clone(value) }; stored[key] = clone(value);
      }
      hooks.storage.emit(changes, "local");
    } }, onChanged: hooks.storage },
    tabs: { query: async ({ url }) => tabs.filter((tab) => !url || url.startsWith(new URL(tab.url).protocol + "//" + new URL(tab.url).hostname + "/")),
      sendMessage: async (id, message) => { messages.push({ id, message }); return { ok: true }; } },
    scripting: { getRegisteredContentScripts: async () => [...registered.values()],
      unregisterContentScripts: async ({ ids }) => ids.forEach((id) => registered.delete(id)),
      registerContentScripts: async (scripts) => scripts.forEach((s) => registered.set(s.id, s)),
      executeScript: async (args) => { injections.push(args); return []; } }
  };
  const context = vm.createContext({ chrome, URL, AbortSignal, crypto: webcrypto, console, fetch: async (url, options) => {
    if (url === extensionBase + "catalog.json") return { json: async () => clone(initialCatalog) };
    if (url === extensionBase + "catalog-estoque.json") return { json: async () => clone(stockCatalog) };
    if (url === extensionBase + "catalog-financeiro.json") return { json: async () => clone(financeCatalog) };
    if (url === extensionBase + "catalog-integracoes.json") return { json: async () => clone(integrationsCatalog) };
    if (url === extensionBase + "view.css") return { text: async () => source("view.css") };
    network.push({ url, options }); return folderResponses.get(new URL(url).searchParams.get("id")) || folderResponse;
  } });
  context.importScripts = (name) => vm.runInContext(source(name), context);
  vm.runInContext(source("background.js"), context);
  async function send(message, senderUrl = extensionBase + "options.html", senderDetails = {}) {
    return new Promise((resolve, reject) => {
      let used = false;
      for (const fn of hooks.messages.listeners) {
        const result = fn(message, { id: extensionId, url: senderUrl, ...senderDetails }, (response) => { used = true; resolve(response); });
        if (result === true) used = true;
      }
      if (!used) reject(new Error("No message handler"));
    });
  }
  return { send, stored, allowed, registered, injections, messages, network, permissionRequests, storageChanges: hooks.storage,
    lifecycle: async (name) => Promise.all([...chrome.runtime[name].listeners].map((fn) => fn({ reason: "update" }))),
    permissionEvent: async (name, origins) => Promise.all([...chrome.permissions[name].listeners].map((fn) => fn({ origins }))),
    setPermissionGranted: (value) => { permissionGranted = value; },
    setFolderResponse: (r, folderId) => { if (folderId) folderResponses.set(folderId, r); else folderResponse = r; } };
}
const fixture = `<div id="fixture-chat"><div class="message-sender">
  <div id="input_envio_msg" contenteditable="true"></div>
  <div class="message-sender-toolbar"><div class="message-sender-actions" data-group="first"><button>Arquivo</button></div>
  <div class="message-sender-actions" data-group="last"><button id="fixture-send">Enviar</button></div></div>
</div></div><textarea id="message_agent_smith_v2">Rascunho da IA</textarea>`;
function pageHarness(url = `${origin}/atendimento/1`, html = fixture) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url, runScripts: "outside-only", pretendToBeVisual: true });
  const window = dom.window;
  let state = { catalog: clone(initialCatalog), catalogs: { fiscal: clone(initialCatalog), estoque: clone(stockCatalog), financeiro: clone(financeCatalog), integracoes: clone(integrationsCatalog) },
    activeArea: "fiscal", lastSyncByArea: {}, favorites: [], opaOrigin: origin,
    introduction: coreContext().defaultIntroduction, lastSync: null, css: source("view.css") };
  const runtimeMessages = eventHook();
  const storageChanges = eventHook();
  const requests = [];
  const remoteCatalogs = { fiscal: clone(initialCatalog), estoque: clone(stockCatalog), financeiro: clone(financeCatalog), integracoes: clone(integrationsCatalog) };
  const fetchFailures = new Map();
  const remoteHtml = new Map();
  const folderHtml = new Map();
  let permissionGranted = true;
  let activeUrl = `${origin}/atendimento/1`;
  window.chrome = {
    runtime: { id: extensionId, onMessage: runtimeMessages, sendMessage: async (message) => {
      requests.push(message);
      if (message.type === "SV_STATE") return { ok: true, state: clone(state) };
      if (message.type === "SV_REQUEST_DRIVE") return { ok: true, granted: permissionGranted };
      if (message.type === "SV_SET_ORIGIN") {
        const oldValue = state.opaOrigin; state.opaOrigin = message.origin;
        storageChanges.emit({ opaOrigin: { oldValue, newValue: message.origin } }, "local");
        return { ok: true, origin: message.origin };
      }
      if (message.type === "SV_SET_MESSAGE") {
        const oldValue = state.introduction; state.introduction = message.introduction;
        storageChanges.emit({ introduction: { oldValue, newValue: message.introduction } }, "local");
        return { ok: true, introduction: message.introduction };
      }
      if (message.type === "SV_SET_AREA") {
        state.activeArea = message.areaId; state.catalog = state.catalogs[message.areaId];
        return { ok: true, state: clone(state) };
      }
      if (message.type === "SV_FETCH_FOLDER") {
        const areaId = message.areaId || "fiscal";
        if (folderHtml.has(message.folderId)) {
          const value = folderHtml.get(message.folderId);
          return value instanceof Error ? { ok: false, error: value.message } : { ok: true, html: value, scanId: `mock-${areaId}` };
        }
        if (fetchFailures.has(areaId)) return { ok: false, error: fetchFailures.get(areaId) };
        if (remoteHtml.has(areaId)) return { ok: true, html: remoteHtml.get(areaId) };
        const catalog = remoteCatalogs[areaId];
        const wrapper = window.document.createElement("div"); wrapper.className = "flip-contents";
        for (const item of catalog.items) {
          const a = window.document.createElement("a"); a.href = item.url; a.textContent = item.originalFilename; wrapper.append(a);
        }
        return { ok: true, html: wrapper.outerHTML, scanId: `mock-${areaId}` };
      }
      if (message.type === "SV_SAVE_CATALOG") {
        state.catalogs[message.areaId] = message.catalog; state.catalog = state.catalogs[state.activeArea];
        return { ok: true, state: clone(state) };
      }
      if (message.type === "SV_FAVORITE") {
        state.favorites = state.favorites.includes(message.id) ? state.favorites.filter((id) => id !== message.id) : [...state.favorites, message.id];
        return { ok: true, favorites: [...state.favorites] };
      }
      return { ok: true };
    } },
    storage: { onChanged: storageChanges },
    tabs: { query: async () => [{ id: 1, url: activeUrl }], sendMessage: async (_, message) => { requests.push(message); return { ok: true }; } }
  };
  window.HTMLElement.prototype.getClientRects = function () {
    return this.id === "input_envio_msg" && !this.closest("[hidden]") ? [{ width: 300, height: 80 }] : [];
  };
  const run = (name) => window.eval(source(name));
  run("core.js"); run("view.js");
  const settle = () => new Promise((resolve) => window.setTimeout(resolve, 35));
  const send = (message) => {
    let response;
    runtimeMessages.emit(message, { id: extensionId }, (result) => { response = result; });
    return response;
  };
  return { window, document: window.document, run, settle, send, requests, runtimeMessages, storageChanges,
    setRemoteCatalog: (id, catalog) => { remoteCatalogs[id] = clone(catalog); },
    setFetchFailure: (id, error) => { fetchFailures.set(id, error); },
    setRemoteHtml: (id, html) => { remoteHtml.set(id, html); },
    setFolderHtml: (id, html) => { folderHtml.set(id, html); },
    setPermissionGranted: (value) => { permissionGranted = value; },
    setState: (next) => { state = next; }, setActiveUrl: (next) => { activeUrl = next; },
    close: () => { window.__opaSpeedVideos?.destroy(); window.close(); } };
}
function readableText(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeName === "BR") return "\n";
  return [...node.childNodes].map(readableText).join("");
}

test("manifest points to packaged files and restricts host access to Opa and optional Drive", () => {
  const manifest = JSON.parse(source("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, [opaPattern]);
  assert.deepEqual(manifest.optional_host_permissions, ["https://drive.google.com/*"]);
  assert.equal(manifest.permissions.includes("activeTab"), false);
  assert.equal(manifest.content_scripts, undefined);
  for (const name of [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page, "core.js", "view.js", "content.js", "catalog.json", "catalog-estoque.json", "catalog-financeiro.json", "catalog-integracoes.json", "view.css"]) {
    assert.ok(fs.existsSync(path.join(root, name)), name);
  }
  for (const name of ["popup.html", "options.html"]) {
    const document = new JSDOM(source(name)).window.document;
    assert.equal(document.querySelectorAll("script:not([src])").length, 0);
    for (const el of document.querySelectorAll("script[src],link[href]")) assert.ok(fs.existsSync(path.join(root, el.src ? el.getAttribute("src") : el.getAttribute("href"))));
    document.defaultView.close();
  }
});
test("all 76 bundled links survive validation; duplicate and unsafe links are rejected", () => {
  const core = coreContext();
  const catalog = core.validateCatalog(initialCatalog);
  assert.equal(catalog.items.length, 76);
  for (let i = 0; i < 76; i++) assert.equal(catalog.items[i].url, initialCatalog.items[i].url);
  const duplicate = clone(initialCatalog); duplicate.items.push(duplicate.items[0]);
  assert.throws(() => core.validateCatalog(duplicate), /repetido/);
  for (const url of ["javascript:alert(1)", "https://example.com/file/d/xyz/view", "https://drive.google.com.evil.test/file/d/xyz/view", "https://user:pass@drive.google.com/file/d/xyz/view", "https://drive.google.com:8443/file/d/xyz/view"]) {
    assert.equal(core.itemFromFile("Vídeo.mp4", url), null);
  }
  assert.throws(() => core.validateCatalog({ items: [] }), /lista válida/);
});
test("search handles accents, multiple terms, aliases, topics and favorites", () => {
  const core = coreContext(); const items = core.validateCatalog(initialCatalog).items;
  const certificate = core.search(items, "CERTIFICADO A1");
  assert.ok(certificate.some((item) => /certificado A1/i.test(item.title)));
  assert.deepEqual(core.search(items, "relatorio query").map((i) => i.id), core.search(items, "RELATÓRIO QUERY").map((i) => i.id));
  assert.ok(core.search(items, "nfse").some((i) => /NFS-e Nacional/i.test(i.title)));
  assert.ok(core.search(items, "nfe").some((i) => /modelo \(55\)/i.test(i.topic)));
  const discount = core.search(items, "desconto nfcom");
  assert.ok(discount.some((item) => /colocar desconto/i.test(item.title)));
  const favorite = items[0];
  assert.equal(core.search(items, "", "", true, [favorite.id])[0].id, favorite.id);
  assert.equal(core.search(items, "", "", true, []).length, 0);
  assert.ok(core.search(items, "", "Query Builder").every((i) => i.topic === "Query Builder"));
  assert.equal(core.messageFor(favorite, false), favorite.url);
  assert.ok(core.messageFor(favorite, true).endsWith(favorite.title + "\n" + favorite.url));
});
test("Opa configuration accepts paths but rejects credentials and non-web URLs", () => {
  const core = coreContext();
  assert.equal(core.normalizeOpaUrl(`${origin}/chat?x=1`), origin);
  assert.equal(core.originPattern(origin), opaPattern);
  for (const input of ["opa.example", "javascript:alert(1)", "https://user:secret@opa.example/"]) assert.throws(() => core.normalizeOpaUrl(input));
});
test("public-folder parser excludes subfolders and naming template; unreadable responses fail", () => {
  const page = pageHarness();
  try {
    const document = page.document; const container = document.createElement("div");
    for (const item of initialCatalog.items) {
      const a = document.createElement("a"); a.href = item.url; a.textContent = item.originalFilename; container.append(a);
    }
    const template = document.createElement("a"); template.href = "https://drive.google.com/file/d/template/view"; template.textContent = "✔ | Data | nomenclatura do conteúdo.mp4";
    const folder = document.createElement("a"); folder.href = "https://drive.google.com/drive/folders/revisar"; folder.textContent = "REVISAR";
    container.append(template, folder);
    const parsed = page.window.SpeedVideosCore.parsePublicFolder(container.innerHTML);
    assert.equal(parsed.items.length, 76);
    assert.throws(() => page.window.SpeedVideosCore.parsePublicFolder("<p>Faça login</p>"), /catálogo anterior/);
    if (process.env.SPEEDVIDEOS_FOLDER_HTML) {
      const actualHtml = fs.readFileSync(process.env.SPEEDVIDEOS_FOLDER_HTML, "utf8");
      const actual = page.window.SpeedVideosCore.parsePublicFolder(actualHtml);
      assert.equal(actual.items.length, 76);
      assert.deepEqual([...actual.items.map((i) => i.id)].sort(), initialCatalog.items.map((i) => i.id).sort());
    }
  } finally { page.close(); }
});
test("worker honors withheld Opa access and injects only the fixed exact origin", async () => {
  const worker = workerHarness();
  worker.allowed.delete(opaPattern);
  assert.equal((await worker.send({ type: "SV_STATE" })).state.catalog.items.length, 76);
  assert.equal((await worker.send({ type: "SV_SET_ORIGIN", origin })).ok, false);
  assert.equal(worker.stored.opaOrigin, undefined);
  worker.allowed.add(opaPattern);
  assert.equal((await worker.send({ type: "SV_SET_ORIGIN", origin })).ok, true);
  assert.equal(worker.registered.size, 1);
  assert.deepEqual(worker.injections.map((a) => a.target.tabId), [1]);
  assert.equal(worker.stored.opaOrigin, origin);
});
test("website context cannot change settings or update the catalog", async () => {
  const worker = workerHarness();
  for (const type of ["SV_SET_ORIGIN", "SV_SAVE_CATALOG", "SV_FETCH_FOLDER"]) {
    assert.equal((await worker.send({ type, origin, catalog: initialCatalog }, `${origin}/chat`)).ok, false);
  }
  assert.deepEqual(worker.stored, {});
  assert.equal(worker.network.length, 0);
});
test("failed updates retain the catalog; requests omit Google account credentials", async () => {
  const worker = workerHarness();
  await worker.send({ type: "SV_SAVE_CATALOG", catalog: initialCatalog });
  const before = clone(worker.stored.catalogs.fiscal);
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER" })).ok, false);
  assert.equal(worker.network.length, 0);
  worker.allowed.add("https://drive.google.com/*");
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER" })).ok, false);
  assert.deepEqual(worker.stored.catalogs.fiscal, before);
  assert.equal(worker.network[0].options.credentials, "omit");
  assert.equal((await worker.send({ type: "SV_SAVE_CATALOG", catalog: { items: [] } })).ok, false);
  assert.deepEqual(worker.stored.catalogs.fiscal, before);
});
test("favorite writes are serialized and disabling removes integration without removing a required permission", async () => {
  const worker = workerHarness();
  const ids = initialCatalog.items.slice(0, 2).map((i) => i.id);
  await Promise.all(ids.map((id) => worker.send({ type: "SV_FAVORITE", id })));
  assert.deepEqual([...worker.stored.favorites].sort(), ids.sort());
  worker.allowed.add(opaPattern);
  await worker.send({ type: "SV_SET_ORIGIN", origin });
  await worker.send({ type: "SV_SET_ORIGIN", origin: "" });
  assert.equal(worker.registered.size, 0);
  assert.equal(worker.allowed.has(opaPattern), true);
  assert.equal(worker.stored.opaOrigin, "");
  assert.ok(worker.messages.some((entry) => entry.message.type === "SV_DISABLE"));
});
test("fallback insertion preserves the draft and AI field, raises input, and never sends", async () => {
  const page = pageHarness();
  try {
    const editor = page.document.getElementById("input_envio_msg");
    editor.innerHTML = "Olá, <b>cliente</b>!";
    let inputCount = 0, sendCount = 0, enterCount = 0;
    editor.addEventListener("input", () => inputCount++);
    page.document.getElementById("fixture-send").addEventListener("click", () => sendCount++);
    page.document.addEventListener("keydown", (e) => { if (e.key === "Enter") enterCount++; });
    page.run("content.js"); await page.settle();
    const host = page.document.getElementById("opa-speedvideos-trigger");
    assert.ok(host); assert.equal(host.parentElement.dataset.group, "first");
    const text = `Vídeo escolhido\n${initialCatalog.items[0].url}`;
    assert.equal(page.send({ type: "SV_INSERT", text }).ok, true);
    assert.equal(readableText(editor), "Olá, cliente!\n\n" + text);
    assert.equal(editor.querySelector("b").textContent, "cliente");
    assert.equal(inputCount, 1); assert.equal(sendCount, 0); assert.equal(enterCount, 0);
    assert.equal(page.document.getElementById("message_agent_smith_v2").value, "Rascunho da IA");
    assert.equal(page.send({ type: "SV_INSERT", text: "" }).ok, false);
    assert.equal(page.send({ type: "SV_INSERT", text: "a".repeat(10001) }).ok, false);
  } finally { page.close(); }
});
test("native editing is not duplicated and produces only one input event", async () => {
  const page = pageHarness();
  try {
    const editor = page.document.getElementById("input_envio_msg");
    let count = 0; editor.addEventListener("input", () => count++);
    page.document.execCommand = (command, _, text) => {
      assert.equal(command, "insertText");
      page.window.getSelection().getRangeAt(0).insertNode(page.document.createTextNode(text));
      editor.dispatchEvent(new page.window.InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      return true;
    };
    page.run("content.js"); await page.settle();
    assert.equal(page.send({ type: "SV_INSERT", text: initialCatalog.items[0].url }).ok, true);
    assert.equal(readableText(editor), initialCatalog.items[0].url); assert.equal(count, 1);
  } finally { page.close(); }
});
test("repeated injection and replacing the chat keep exactly one trigger", async () => {
  const page = pageHarness();
  try {
    page.run("content.js"); await page.settle(); page.run("content.js");
    assert.equal(page.runtimeMessages.listeners.size, 1);
    const next = page.document.createElement("div"); next.innerHTML = fixture;
    page.document.getElementById("fixture-chat").replaceWith(next.querySelector("#fixture-chat"));
    await page.settle();
    assert.equal(page.document.querySelectorAll("#opa-speedvideos-trigger").length, 1);
    assert.equal(page.send({ type: "SV_INSERT", text: "Depois da troca" }).ok, true);
    assert.equal(readableText(page.document.getElementById("input_envio_msg")), "Depois da troca");
    page.send({ type: "SV_DISABLE" });
    assert.equal(page.document.querySelectorAll("#opa-speedvideos-trigger").length, 0);
    assert.equal(page.runtimeMessages.listeners.size, 0);
  } finally { page.close(); }
});
test("content adapter does not activate on another port or origin", async () => {
  for (const url of [`${origin}:8443/chat`, "https://other.example/chat"]) {
    const page = pageHarness(url);
    try {
      page.run("content.js"); await page.settle();
      assert.equal(page.document.getElementById("opa-speedvideos-trigger"), null);
      assert.equal(page.runtimeMessages.listeners.size, 0);
    } finally { page.close(); }
  }
});
test("chat button opens the catalog and inserting closes it with a draft ready for review", async () => {
  const page = pageHarness();
  try {
    page.run("content.js"); await page.settle();
    const trigger = page.document.getElementById("opa-speedvideos-trigger").shadowRoot.querySelector("button");
    trigger.click(); await page.settle();
    const panel = page.document.getElementById("opa-speedvideos-panel");
    assert.ok(panel);
    assert.equal(panel.shadowRoot.querySelectorAll(".sv-card").length, 76);
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    const url = panel.shadowRoot.querySelector(".sv-link").href;
    panel.shadowRoot.querySelector(".sv-primary").click(); await page.settle();
    assert.ok(readableText(page.document.getElementById("input_envio_msg")).endsWith(url));
    assert.equal(page.document.getElementById("opa-speedvideos-panel"), null);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(page.document.activeElement.id, "input_envio_msg");
  } finally { page.close(); }
});
test("catalog UI filters and inserts the selected link, and treats names as text", async () => {
  const page = pageHarness();
  try {
    let inserted;
    const container = page.document.createElement("div"); page.document.body.append(container);
    const state = (await page.window.SpeedVideosView.send({ type: "SV_STATE" })).state;
    const view = page.window.SpeedVideosView.mount(container, { state, onInsert: async (text) => { inserted = text; } });
    assert.equal(container.querySelectorAll(".sv-card").length, 76);
    const search = container.querySelector('input[type="search"]'); search.value = "certificado a1";
    search.dispatchEvent(new page.window.Event("input"));
    assert.ok(container.querySelectorAll(".sv-card").length > 0);
    container.querySelectorAll('input[type="checkbox"]')[1].checked = false;
    const link = container.querySelector(".sv-link").href;
    container.querySelector(".sv-primary").click(); await page.settle(); assert.equal(inserted, link);
    container.querySelector(".sv-star").click(); await page.settle();
    const favoriteOnly = container.querySelector('input[type="checkbox"]'); favoriteOnly.checked = true;
    favoriteOnly.dispatchEvent(new page.window.Event("change"));
    assert.equal(container.querySelectorAll(".sv-card").length, 1);
    assert.equal(container.querySelector(".sv-star").getAttribute("aria-pressed"), "true");
    view.destroy();
    const unsafeTitle = '<img src="x" onerror="alert(1)">';
    const item = { ...state.catalog.items[0], title: unsafeTitle, displayTitle: "Assunto | " + unsafeTitle };
    const next = page.window.SpeedVideosView.mount(container, { state: { ...state, catalog: { items: [item] } }, onInsert: async () => {} });
    assert.equal(container.querySelector("h3").textContent, "Assunto | " + unsafeTitle); assert.equal(container.querySelector("img"), null);
    next.destroy();
  } finally { page.close(); }
});
test("popup refuses to insert into an unrelated active tab", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    page.setActiveUrl("https://unrelated.example/"); page.run("popup.js"); await page.settle();
    page.document.querySelector(".sv-primary").click(); await page.settle();
    assert.match(page.document.querySelector(".sv-status").textContent, /suporte\.ixcsoft\.com\.br/);
    assert.equal(page.requests.filter((r) => r.type === "SV_INSERT").length, 0);
  } finally { page.close(); }
});
test("stock catalog preserves all 184 links and reads the supplied 171-item root snapshot", () => {
  const page = pageHarness();
  try {
    const core = page.window.SpeedVideosCore;
    const catalog = core.validateCatalog(stockCatalog, "estoque");
    assert.equal(catalog.items.length, 184);
    for (let i = 0; i < 184; i++) assert.equal(catalog.items[i].url, stockCatalog.items[i].url);
    assert.ok(core.search(catalog.items, "comodato").length > 0);
    assert.equal(core.itemFromFile("03-03-2026 -Manter conectado mobile.mp4", catalog.items[0].url, "Estoque").title, "Manter conectado mobile");
    assert.equal(core.itemFromFile("03-03-2026 -Manter conectado mobile.mp4", catalog.items[0].url, "Estoque").dateInFilename, "2026-03-03");
    if (process.env.SPEEDVIDEOS_STOCK_HTML) {
      const actual = core.parsePublicFolder(fs.readFileSync(process.env.SPEEDVIDEOS_STOCK_HTML, "utf8"), "estoque");
      assert.equal(actual.items.length, 171);
      const rootItems = stockCatalog.items.filter((item) => item.folderId === "1Is02Ons_d8KJ4n_C7E48zHLUgoIu8jhp");
      assert.deepEqual([...actual.items.map((i) => i.id)].sort(), rootItems.map((i) => i.id).sort());
      assert.equal(actual.source.folderId, "1Is02Ons_d8KJ4n_C7E48zHLUgoIu8jhp");
    }
  } finally { page.close(); }
});
test("worker remembers the selected area and rejects unknown areas", async () => {
  const worker = workerHarness();
  const selected = await worker.send({ type: "SV_SET_AREA", areaId: "estoque" });
  assert.equal(selected.ok, true); assert.equal(selected.state.activeArea, "estoque");
  assert.equal(selected.state.catalog.items.length, 184);
  assert.equal((await worker.send({ type: "SV_STATE" })).state.activeArea, "estoque");
  assert.equal((await worker.send({ type: "SV_SET_AREA", areaId: "comercial" })).ok, false);
  assert.equal(worker.stored.activeArea, "estoque");
  await worker.send({ type: "SV_SET_AREA", areaId: "fiscal" });
  assert.equal((await worker.send({ type: "SV_STATE" })).state.catalog.items.length, 76);
});
test("version 0.1 configuration, fiscal catalog, favorites and sync time survive the update", async () => {
  const worker = workerHarness();
  const previous = clone(initialCatalog); delete previous.areaId; previous.snapshotDate = "2026-10-06";
  worker.stored.catalog = previous; worker.stored.opaOrigin = origin;
  worker.stored.favorites = [previous.items[0].id]; worker.stored.lastSync = "2026-10-06T15:00:00Z";
  const { state } = await worker.send({ type: "SV_STATE" });
  assert.equal(state.catalogs.fiscal.snapshotDate, "2026-10-06");
  assert.equal(state.catalogs.estoque.items.length, 184);
  assert.equal(state.opaOrigin, origin); assert.equal(state.favorites[0], previous.items[0].id);
  assert.equal(state.lastSyncByArea.fiscal, worker.stored.lastSync);
  await worker.send({ type: "SV_SAVE_CATALOG", areaId: "estoque", catalog: stockCatalog });
  assert.equal((await worker.send({ type: "SV_STATE" })).state.catalogs.fiscal.snapshotDate, "2026-10-06");
});
test("stock fetch uses the stock folder and its update cannot overwrite the fiscal catalog", async () => {
  const worker = workerHarness(); worker.allowed.add("https://drive.google.com/*");
  worker.setFolderResponse({ ok: true, url: "https://drive.google.com/embeddedfolderview", text: async () => "<p>fixture</p>" });
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "estoque" })).ok, true);
  assert.ok(worker.network[0].url.includes("1Is02Ons_d8KJ4n_C7E48zHLUgoIu8jhp"));
  assert.equal((await worker.send({ type: "SV_SAVE_CATALOG", areaId: "estoque", catalog: initialCatalog })).ok, false);
  await worker.send({ type: "SV_SAVE_CATALOG", areaId: "estoque", catalog: stockCatalog });
  assert.equal(worker.stored.catalogs.estoque.itemCount, 184);
  assert.equal(worker.stored.catalogs.fiscal, undefined);
  const { state } = await worker.send({ type: "SV_STATE" });
  assert.equal(state.catalogs.fiscal.items.length, 76);
  assert.equal(state.catalogs.estoque.items.length, 184);
});
test("simultaneous area updates and favorites preserve both catalogs", async () => {
  const worker = workerHarness();
  await Promise.all([
    worker.send({ type: "SV_SAVE_CATALOG", areaId: "fiscal", catalog: initialCatalog }),
    worker.send({ type: "SV_SAVE_CATALOG", areaId: "estoque", catalog: stockCatalog }),
    worker.send({ type: "SV_FAVORITE", id: initialCatalog.items[0].id }),
    worker.send({ type: "SV_FAVORITE", id: stockCatalog.items[0].id })
  ]);
  assert.equal(worker.stored.catalogs.fiscal.itemCount, 76);
  assert.equal(worker.stored.catalogs.estoque.itemCount, 184);
  assert.ok(worker.stored.favorites.includes(initialCatalog.items[0].id));
  assert.ok(worker.stored.favorites.includes(stockCatalog.items[0].id));
});
test("chat area switch clears fiscal filters and inserts a stock link", async () => {
  const page = pageHarness();
  try {
    page.run("content.js"); await page.settle();
    page.document.getElementById("opa-speedvideos-trigger").shadowRoot.querySelector("button").click(); await page.settle();
    const panel = page.document.getElementById("opa-speedvideos-panel").shadowRoot;
    const input = panel.querySelector('input[type="search"]'); input.value = "nfcom"; input.dispatchEvent(new page.window.Event("input"));
    assert.ok(panel.querySelectorAll(".sv-card").length < 76);
    const favorites = panel.querySelector('input[type="checkbox"]'); favorites.checked = true;
    favorites.dispatchEvent(new page.window.Event("change"));
    const sector = panel.querySelector(".sv-sector-select"); sector.value = "estoque";
    sector.dispatchEvent(new page.window.Event("change")); await page.settle();
    assert.equal(input.value, ""); assert.equal(favorites.checked, false);
    assert.equal(panel.querySelectorAll(".sv-card").length, 184);
    assert.equal(sector.value, "estoque");
    const url = panel.querySelector(".sv-link").href;
    assert.ok(stockCatalog.items.some((item) => item.url === url));
    panel.querySelector(".sv-primary").click(); await page.settle();
    assert.ok(readableText(page.document.getElementById("input_envio_msg")).endsWith(url));
  } finally { page.close(); }
});
test("popup has a sector dropdown and retains favorites when switching back", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    page.run("popup.js"); await page.settle();
    const firstId = page.document.querySelector(".sv-link").href;
    page.document.querySelector(".sv-star").click(); await page.settle();
    const sector = page.document.querySelector(".sv-sector-select");
    assert.equal(sector.options.length, coreContext().areas.length); assert.equal(page.document.querySelector(".sv-area-btn"), null);
    sector.value = "estoque"; sector.dispatchEvent(new page.window.Event("change")); await page.settle();
    assert.equal(page.document.querySelectorAll(".sv-card").length, 184);
    sector.value = "fiscal"; sector.dispatchEvent(new page.window.Event("change")); await page.settle();
    const favorites = page.document.querySelector('input[type="checkbox"]'); favorites.checked = true;
    favorites.dispatchEvent(new page.window.Event("change"));
    assert.equal(page.document.querySelectorAll(".sv-card").length, 1);
    assert.equal(page.document.querySelector(".sv-link").href, firstId);
  } finally { page.close(); }
});
test("options refreshes only the chosen area and displays its own count and source", async () => {
  const page = pageHarness(`${origin}/chat`, source("options.html"));
  try {
    page.window.chrome.permissions = { request: async () => true };
    page.run("options.js"); await page.settle();
    const select = page.document.getElementById("catalog-area"); select.value = "estoque";
    select.dispatchEvent(new page.window.Event("change"));
    assert.match(page.document.getElementById("catalog-info").textContent, /Estoque: 184/);
    assert.ok(page.document.getElementById("folder-link").href.includes("1Is02Ons_d8KJ4n_C7E48zHLUgoIu8jhp"));
    page.document.getElementById("update").click(); await page.settle();
    assert.equal(page.requests.find((r) => r.type === "SV_FETCH_FOLDER").areaId, "estoque");
    assert.equal(page.requests.find((r) => r.type === "SV_SAVE_CATALOG").areaId, "estoque");
    assert.match(page.document.getElementById("update-status").textContent, /Estoque atualizado: 184/);
  } finally { page.close(); }
});
function withNewVideo(catalog, areaId) {
  const copy = clone(catalog);
  const topic = areaId === "fiscal" ? "NFCom" : "Colaborador";
  const filename = `07/10/2026 - ${topic} | Novo tutorial de teste.mp4`;
  const item = coreContext().itemFromFile(filename, `https://drive.google.com/file/d/mock-new-${areaId}/view?usp=drive_web`, areaId === "fiscal" ? "Fiscal" : "Estoque");
  copy.items.push(clone(item)); copy.itemCount = copy.items.length; return copy;
}
test("refresh button discovers new videos in both folders while preserving area, filters and favorites", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    page.setRemoteCatalog("fiscal", withNewVideo(initialCatalog, "fiscal"));
    page.setRemoteCatalog("estoque", withNewVideo(stockCatalog, "estoque"));
    page.run("popup.js"); await page.settle();
    const favoriteUrl = page.document.querySelector(".sv-link").href;
    page.document.querySelector(".sv-star").click(); await page.settle();
    const input = page.document.querySelector('input[type="search"]'); input.value = "nfcom";
    input.dispatchEvent(new page.window.Event("input"));
    const button = page.document.querySelector(".sv-refresh");
    button.click(); button.click();
    assert.equal(button.disabled, true); await page.settle();
    const state = (await page.window.SpeedVideosView.send({ type: "SV_STATE" })).state;
    assert.equal(state.catalogs.fiscal.items.length, 77); assert.equal(state.catalogs.estoque.items.length, 185);
    assert.equal(state.activeArea, "fiscal"); assert.equal(input.value, "nfcom");
    assert.ok(state.catalogs.fiscal.items.some((item) => item.id === "mock-new-fiscal"));
    assert.ok(state.catalogs.estoque.items.some((item) => item.id === "mock-new-estoque"));
    assert.ok(state.favorites.some((id) => state.catalogs.fiscal.items.find((item) => item.id === id)?.url === favoriteUrl));
    assert.match(page.document.querySelector(".sv-status").textContent, /Fiscal: 1 novo vídeo/);
    assert.match(page.document.querySelector(".sv-status").textContent, /Estoque: 1 novo vídeo/);
    assert.equal(page.requests.filter((r) => r.type === "SV_REQUEST_DRIVE").length, 1);
    assert.equal(button.disabled, false); assert.equal(button.textContent, "Atualizar");
  } finally { page.close(); }
});
test("refresh in the chat works without exposing the permissions API to the content script", async () => {
  const page = pageHarness();
  try {
    assert.equal(page.window.chrome.permissions, undefined);
    page.setRemoteCatalog("estoque", withNewVideo(stockCatalog, "estoque"));
    page.run("content.js"); await page.settle();
    page.document.getElementById("opa-speedvideos-trigger").shadowRoot.querySelector("button").click(); await page.settle();
    const panel = page.document.getElementById("opa-speedvideos-panel").shadowRoot;
    panel.querySelector(".sv-refresh").click(); await page.settle();
    const sector = panel.querySelector(".sv-sector-select"); sector.value = "estoque";
    sector.dispatchEvent(new page.window.Event("change")); await page.settle();
    assert.equal(panel.querySelectorAll(".sv-card").length, 185);
    assert.ok([...panel.querySelectorAll(".sv-link")].some((link) => link.href.includes("mock-new-estoque")));
    assert.equal(readableText(page.document.getElementById("input_envio_msg")), "");
  } finally { page.close(); }
});
test("refresh with no additions reports that the catalogs are current", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    page.run("popup.js"); await page.settle(); page.document.querySelector(".sv-refresh").click(); await page.settle();
    assert.match(page.document.querySelector(".sv-status").textContent, /Fiscal: sem novos vídeos/);
    assert.match(page.document.querySelector(".sv-status").textContent, /Estoque: sem novos vídeos/);
  } finally { page.close(); }
});
test("a failed folder preserves its catalog while the other folder receives new videos", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    page.setFetchFailure("fiscal", "Sem resposta do Drive.");
    page.setRemoteCatalog("estoque", withNewVideo(stockCatalog, "estoque"));
    page.run("popup.js"); await page.settle(); page.document.querySelector(".sv-refresh").click(); await page.settle();
    const { state } = await page.window.SpeedVideosView.send({ type: "SV_STATE" });
    assert.equal(state.catalogs.fiscal.items.length, 76); assert.equal(state.catalogs.estoque.items.length, 185);
    assert.equal(page.requests.filter((r) => r.type === "SV_SAVE_CATALOG").length, coreContext().areas.length - 1);
    const status = page.document.querySelector(".sv-status");
    assert.equal(status.dataset.error, "true"); assert.match(status.textContent, /Fiscal: atualização falhou/);
    assert.match(status.textContent, /Estoque: 1 novo vídeo/);
  } finally { page.close(); }
});
test("empty or login responses never erase a saved catalog", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    page.setRemoteHtml("fiscal", '<html><body><p>Faça login</p></body></html>');
    page.setRemoteHtml("estoque", "");
    page.setRemoteHtml("financeiro", "");
    page.setRemoteHtml("integracoes", "");
    page.run("popup.js"); await page.settle(); page.document.querySelector(".sv-refresh").click(); await page.settle();
    const { state } = await page.window.SpeedVideosView.send({ type: "SV_STATE" });
    assert.equal(state.catalogs.fiscal.items.length, 76); assert.equal(state.catalogs.estoque.items.length, 184);
    assert.equal(page.requests.filter((r) => r.type === "SV_SAVE_CATALOG").length, 0);
    assert.equal(page.document.querySelector(".sv-status").dataset.error, "true");
  } finally { page.close(); }
});
test("denied Drive permission makes no folder requests or catalog writes", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    page.setPermissionGranted(false); page.run("popup.js"); await page.settle();
    page.document.querySelector(".sv-refresh").click(); await page.settle();
    assert.equal(page.requests.filter((r) => r.type === "SV_FETCH_FOLDER" || r.type === "SV_SAVE_CATALOG").length, 0);
    assert.match(page.document.querySelector(".sv-status").textContent, /não foi permitida/);
    assert.equal(page.document.querySelector(".sv-refresh").disabled, false);
  } finally { page.close(); }
});
test("worker only requests the fixed Drive permission and honors permission refusal", async () => {
  const worker = workerHarness();
  const granted = await worker.send({ type: "SV_REQUEST_DRIVE", origins: ["https://unrelated.example/*"] });
  assert.equal(granted.granted, true);
  assert.deepEqual(worker.permissionRequests, [{ origins: ["https://drive.google.com/*"] }]);
  worker.setPermissionGranted(false);
  assert.equal((await worker.send({ type: "SV_REQUEST_DRIVE" })).granted, false);
});
test("worker permits refresh only from its pages or the fixed top-level Opa tab", async () => {
  const worker = workerHarness(); worker.stored.opaOrigin = origin;
  const sender = { tab: { id: 1 }, frameId: 0 };
  const granted = await worker.send({ type: "SV_REQUEST_DRIVE" }, `${origin}/chat`, sender);
  assert.equal(granted.granted, true);
  worker.setFolderResponse({ ok: true, url: "https://drive.google.com/embeddedfolderview", text: async () => "<p>fixture</p>" });
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "fiscal" }, `${origin}/chat`, sender)).ok, true);
  assert.equal((await worker.send({ type: "SV_SAVE_CATALOG", areaId: "fiscal", catalog: initialCatalog }, `${origin}/chat`, sender)).ok, true);
  for (const url of ["https://other.example/chat", `${origin}:8443/chat`]) {
    assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "fiscal" }, url, sender)).ok, false);
  }
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "fiscal" }, `${origin}/chat`, { tab: { id: 1 }, frameId: 2 })).ok, false);
  assert.equal((await worker.send({ type: "SV_SET_ORIGIN", origin: "https://other.example" }, `${origin}/chat`, sender)).ok, false);
});

test("a new install automatically activates the fixed Opa without requesting permissions or using the network", async () => {
  const worker = workerHarness();
  assert.equal((await worker.send({ type: "SV_STATE" })).state.opaOrigin, origin);
  await worker.lifecycle("onInstalled");
  assert.equal(worker.stored.opaOrigin, origin);
  assert.equal(worker.registered.size, 1);
  assert.equal([...worker.registered.values()][0].matches.join(","), opaPattern);
  assert.deepEqual(worker.injections.map((entry) => entry.target.tabId), [1]);
  assert.equal(worker.permissionRequests.length, 0);
  assert.equal(worker.network.length, 0);
});

test("update migrates a former Opa URL while preserving both catalogs, favorites and the selected area", async () => {
  const previous = { opaOrigin: "https://old.example", catalogs: { fiscal: clone(initialCatalog), estoque: clone(stockCatalog) },
    favorites: [initialCatalog.items[0].id, stockCatalog.items[0].id], activeArea: "estoque",
    lastSyncByArea: { fiscal: "2026-10-07T15:00:00Z", estoque: "2026-10-07T16:00:00Z" } };
  const worker = workerHarness(previous);
  worker.registered.set("speedvideos-opa-chat", { id: "speedvideos-opa-chat", matches: ["https://old.example/*"] });
  await worker.lifecycle("onInstalled");
  assert.deepEqual(worker.stored, { ...previous, opaOrigin: origin });
  assert.equal([...worker.registered.values()][0].matches.join(","), opaPattern);
  const { state } = await worker.send({ type: "SV_STATE" });
  assert.equal(state.activeArea, "estoque"); assert.equal(state.catalog.items.length, 184);
  assert.equal(worker.network.length, 0);
});

test("startup restores the registration and a prior manual disable remains disabled through update", async () => {
  const worker = workerHarness();
  await worker.lifecycle("onStartup");
  assert.equal(worker.registered.size, 1); assert.equal(worker.injections.length, 0);
  const disabled = workerHarness({ opaOrigin: "", favorites: [initialCatalog.items[0].id] });
  await disabled.lifecycle("onInstalled"); await disabled.lifecycle("onStartup");
  assert.equal((await disabled.send({ type: "SV_STATE" })).state.opaOrigin, "");
  assert.equal(disabled.registered.size, 0); assert.equal(disabled.injections.length, 0);
  assert.equal(disabled.stored.favorites[0], initialCatalog.items[0].id);
});

test("withheld Opa access prevents installation injection and granting it restores the integration", async () => {
  const worker = workerHarness(); worker.allowed.delete(opaPattern);
  await worker.lifecycle("onInstalled");
  assert.equal(worker.registered.size, 0); assert.equal(worker.injections.length, 0);
  worker.allowed.add(opaPattern);
  await worker.permissionEvent("onAdded", [opaPattern]);
  assert.equal(worker.registered.size, 1); assert.equal(worker.injections.length, 1);
});

test("even extension pages cannot configure HTTP, other hosts, alternate ports or embedded credentials", async () => {
  const worker = workerHarness();
  for (const bad of ["https://other.example", "http://suporte.ixcsoft.com.br", `${origin}:8443`,
    "https://suporte.ixcsoft.com.br.evil.test", "https://user:secret@suporte.ixcsoft.com.br"]) {
    assert.equal((await worker.send({ type: "SV_SET_ORIGIN", origin: bad })).ok, false, bad);
  }
  assert.deepEqual(worker.stored, {}); assert.equal(worker.injections.length, 0);
  assert.equal(worker.permissionRequests.length, 0);
});

test("all worker actions reject unrelated hosts and subframes before requesting access or changing data", async () => {
  const worker = workerHarness();
  for (const type of ["SV_STATE", "SV_SET_AREA", "SV_FAVORITE", "SV_REQUEST_DRIVE", "SV_FETCH_FOLDER", "SV_SAVE_CATALOG", "SV_OPTIONS"]) {
    const message = { type, areaId: "estoque", id: initialCatalog.items[0].id, catalog: stockCatalog };
    for (const url of ["https://other.example/chat", `${origin}:8443/chat`, "http://suporte.ixcsoft.com.br/chat"]) {
      assert.equal((await worker.send(message, url, { tab: { id: 1 }, frameId: 0 })).ok, false);
    }
    assert.equal((await worker.send(message, `${origin}/chat`, { tab: { id: 1 }, frameId: 2 })).ok, false);
  }
  assert.deepEqual(worker.stored, {}); assert.equal(worker.network.length, 0); assert.equal(worker.permissionRequests.length, 0);
});

test("options displays the fixed address without a URL field and toggles integration using only that address", async () => {
  const page = pageHarness(`${origin}/chat`, source("options.html"));
  try {
    const requested = [];
    page.window.chrome.permissions = { request: async (request) => { requested.push(clone(request)); return true; } };
    page.run("options.js"); await page.settle();
    assert.equal(page.document.querySelector('input[type="url"]'), null);
    assert.equal(page.document.getElementById("opa-address").href, `${origin}/`);
    assert.match(page.document.getElementById("opa-status").textContent, /Ativo em https:\/\/suporte\.ixcsoft\.com\.br/);
    assert.equal(requested.length, 0);
    page.document.getElementById("disable").click(); await page.settle();
    assert.equal((await page.window.SpeedVideosView.send({ type: "SV_STATE" })).state.opaOrigin, "");
    page.document.getElementById("opa-form").dispatchEvent(new page.window.Event("submit", { cancelable: true })); await page.settle();
    assert.deepEqual(requested, [{ origins: [opaPattern] }]);
    assert.equal((await page.window.SpeedVideosView.send({ type: "SV_STATE" })).state.opaOrigin, origin);
    assert.equal(page.document.getElementById("save").disabled, false);
  } finally { page.close(); }
});

test("content adapter rejects an unrelated page even if legacy state contains that page's origin", async () => {
  const page = pageHarness("https://old.example/chat");
  try {
    const { state } = await page.window.SpeedVideosView.send({ type: "SV_STATE" });
    page.setState({ ...state, opaOrigin: "https://old.example" });
    page.run("content.js"); await page.settle();
    assert.equal(page.document.getElementById("opa-speedvideos-trigger"), null);
    assert.equal(page.runtimeMessages.listeners.size, 0);
  } finally { page.close(); }
});

function folderPage(items = [], folders = []) {
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  return `<div class="flip-contents">${items.map((item) => `<a href="${escape(item.url)}">${escape(item.originalFilename)}</a>`).join("")}${folders.map((folder) => `<a href="https://drive.google.com/drive/folders/${escape(folder.id)}"><span>${escape(folder.name)}</span></a>`).join("")}</div>`;
}

test("recursive refresh deduplicates videos and cycles and skips excluded folders at every depth", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    const rootId = page.window.SpeedVideosCore.areaConfig("estoque").folderId;
    const extra = withNewVideo(stockCatalog, "estoque").items.at(-1);
    page.setFolderHtml(rootId, folderPage(stockCatalog.items, [
      { id: "allowed-child", name: "Relatórios Query" }, { id: "skip-root", name: "FORA DE CONTEXTO" }
    ]));
    page.setFolderHtml("allowed-child", folderPage([extra, stockCatalog.items[0]], [
      { id: "allowed-grandchild", name: "Detalhes" }, { id: "skip-deep", name: "Vídeos para REGRÁVAR" },
      { id: rootId, name: "Atalho para a raiz" }
    ]));
    page.setFolderHtml("allowed-grandchild", folderPage([extra], [{ id: "allowed-child", name: "Voltar" }]));
    page.run("popup.js"); await page.settle(); page.document.querySelector(".sv-refresh").click(); await page.settle();
    const { state } = await page.window.SpeedVideosView.send({ type: "SV_STATE" });
    assert.equal(state.catalogs.estoque.items.length, 185);
    assert.equal(state.catalogs.estoque.folders.length, 3); assert.equal(state.catalogs.estoque.ignoredFolders.length, 2);
    const queries = page.requests.filter((request) => request.type === "SV_FETCH_FOLDER" && request.areaId === "estoque");
    assert.deepEqual(queries.map((request) => request.folderId), [rootId, "allowed-child", "allowed-grandchild"]);
    const found = state.catalogs.estoque.items.find((item) => item.id === extra.id);
    assert.equal(found.folderPath, "Estoque / Relatórios Query");
    assert.ok(page.window.SpeedVideosCore.search(state.catalogs.estoque.items, "query").some((item) => item.id === extra.id));
  } finally { page.close(); }
});

test("an empty accessible child and PDF files do not create video entries or stop a scan", async () => {
  const page = pageHarness();
  try {
    const rootId = page.window.SpeedVideosCore.areaConfig("estoque").folderId;
    const pdf = { originalFilename: "Modelo de O.S.pdf", url: "https://drive.google.com/file/d/example-pdf/view" };
    page.setFolderHtml(rootId, folderPage([stockCatalog.items[0], pdf], [{ id: "empty", name: "Pasta vazia" }]));
    page.setFolderHtml("empty", folderPage());
    const result = await page.window.SpeedVideosView.readCatalogTree("estoque");
    assert.equal(result.items.length, 1); assert.equal(result.folders.length, 2);
    assert.equal(result.items[0].id, stockCatalog.items[0].id);
  } finally { page.close(); }
});

test("a failed required subfolder retains the entire saved sector while the other sector can update", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    const rootId = page.window.SpeedVideosCore.areaConfig("estoque").folderId;
    page.setFolderHtml(rootId, folderPage([stockCatalog.items[0]], [{ id: "unreadable", name: "Subpasta restrita" }]));
    page.setFolderHtml("unreadable", new Error("A pasta não está pública."));
    page.setRemoteCatalog("fiscal", withNewVideo(initialCatalog, "fiscal"));
    page.run("popup.js"); await page.settle(); page.document.querySelector(".sv-refresh").click(); await page.settle();
    const { state } = await page.window.SpeedVideosView.send({ type: "SV_STATE" });
    assert.equal(state.catalogs.fiscal.items.length, 77); assert.equal(state.catalogs.estoque.items.length, 184);
    assert.equal(page.requests.filter((request) => request.type === "SV_SAVE_CATALOG" && request.areaId === "estoque").length, 0);
    assert.match(page.document.querySelector(".sv-status").textContent, /Subpasta restrita/);
  } finally { page.close(); }
});

test("worker accepts only subfolders discovered in the same sector scan and never permits excluded branches", async () => {
  const worker = workerHarness(); worker.allowed.add("https://drive.google.com/*");
  const rootId = coreContext().areaConfig("estoque").folderId;
  worker.setFolderResponse({ ok: true, url: "https://drive.google.com/embeddedfolderview", text: async () => folderPage([], [
    { id: "allowed-child", name: "Relatórios" }, { id: "skip-regravar", name: "REGRÁVAR" },
    { id: "skip-context", name: "Fora de contexto" }
  ]) }, rootId);
  worker.setFolderResponse({ ok: true, url: "https://drive.google.com/embeddedfolderview", text: async () => folderPage() }, "allowed-child");
  const scan = await worker.send({ type: "SV_FETCH_FOLDER", areaId: "estoque" }); assert.equal(scan.ok, true);
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "estoque", folderId: "allowed-child", scanId: scan.scanId })).ok, true);
  for (const folderId of ["skip-regravar", "skip-context", "not-in-this-folder"]) {
    assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "estoque", folderId, scanId: scan.scanId })).ok, false);
  }
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "fiscal", folderId: "allowed-child", scanId: scan.scanId })).ok, false);
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "estoque", folderId: "allowed-child" })).ok, false);
  assert.equal(worker.network.length, 2);
  assert.ok(worker.network.every((request) => request.options.credentials === "omit"));
});

test("excluded-folder matching ignores accents and case and worker extraction handles encoded names", () => {
  const core = coreContext();
  for (const name of ["Fora de contexto 2026", "FORA DO CONTEXTO - Fiscal", "Vídeos para REGRÁVAR", "regravar_old"]) assert.equal(core.isIgnoredFolder(name), true);
  for (const name of ["Relatórios Query", "Modelos de O.S Padrão", "Revisão geral"]) assert.equal(core.isIgnoredFolder(name), false);
  const html = '<a href="https://drive.google.com/drive/folders/skip"><b>Fora&#32;de&#32;contexto</b></a><a href="https://evil.test/drive/folders/nope">Vídeos</a>';
  const folders = core.foldersInHtml(html); assert.equal(folders.length, 1); assert.equal(core.isIgnoredFolder(folders[0].name), true);
});

test("custom introduction keeps the original fiscal subject and title with a pipe, omitting date and extension", () => {
  const core = coreContext();
  const item = core.itemFromFile("✔ 07_10_2026-NFCom (62) | Como alterar o CFOP.webm", "https://drive.google.com/file/d/sample-video/view");
  assert.equal(core.messageFor(item, true, "Olá! Segue a orientação:"), "Olá! Segue a orientação:\nNFCom (62) | Como alterar o CFOP\nhttps://drive.google.com/file/d/sample-video/view");
  assert.equal(core.messageFor(item, true, ""), "NFCom (62) | Como alterar o CFOP\nhttps://drive.google.com/file/d/sample-video/view");
  assert.equal(core.messageFor(item, false, "Qualquer mensagem"), item.url);
  assert.throws(() => core.validateIntroduction("a".repeat(2001)), /2.000/);
  assert.equal(core.itemFromFile("Modelo.pdf", item.url), null);
  const query = core.itemFromFile("Clientes sem OSs (Campos: ID Cliente | Nome cliente).webm", item.url, "Estoque");
  assert.equal(query.title, "Clientes sem OSs (Campos: ID Cliente | Nome cliente)");
});

test("worker saves individual message preferences and blocks edits from the Opa page", async () => {
  const worker = workerHarness();
  assert.equal((await worker.send({ type: "SV_STATE" })).state.introduction, coreContext().defaultIntroduction);
  const saved = await worker.send({ type: "SV_SET_MESSAGE", introduction: "  Olá!\r\nSegue a orientação:  " });
  assert.equal(saved.ok, true); assert.equal(saved.introduction, "Olá!\nSegue a orientação:");
  assert.equal((await worker.send({ type: "SV_STATE" })).state.introduction, saved.introduction);
  assert.equal((await worker.send({ type: "SV_SET_MESSAGE", introduction: "a".repeat(2001) })).ok, false);
  assert.equal((await worker.send({ type: "SV_SET_MESSAGE", introduction: "alterada" }, `${origin}/chat`, { tab: { id: 1 }, frameId: 0 })).ok, false);
  assert.equal(worker.stored.introduction, saved.introduction);
});

test("options preview and save the introduction as plain text", async () => {
  const page = pageHarness(`${origin}/chat`, source("options.html"));
  try {
    page.run("options.js"); await page.settle();
    const input = page.document.getElementById("message-introduction"); input.value = 'Olá! <img src="x">';
    input.dispatchEvent(new page.window.Event("input"));
    const preview = page.document.getElementById("message-preview");
    assert.ok(preview.textContent.startsWith(input.value + "\n")); assert.equal(preview.querySelector("img"), null);
    assert.ok(preview.textContent.includes(" | "));
    page.document.getElementById("message-form").dispatchEvent(new page.window.Event("submit", { cancelable: true })); await page.settle();
    assert.equal((await page.window.SpeedVideosView.send({ type: "SV_STATE" })).state.introduction, input.value);
    assert.match(page.document.getElementById("message-status").textContent, /Mensagem salva/);
    page.document.getElementById("reset-message").click();
    assert.equal(input.value, page.window.SpeedVideosCore.defaultIntroduction);
  } finally { page.close(); }
});

test("chat insertion uses the latest saved custom message with subject, title and link without sending", async () => {
  const page = pageHarness();
  try {
    page.run("content.js"); await page.settle();
    page.document.getElementById("opa-speedvideos-trigger").shadowRoot.querySelector("button").click(); await page.settle();
    await page.window.SpeedVideosView.send({ type: "SV_SET_MESSAGE", introduction: "Este vídeo pode ajudar:" }); await page.settle();
    const panel = page.document.getElementById("opa-speedvideos-panel").shadowRoot;
    const url = panel.querySelector(".sv-link").href;
    const item = page.window.SpeedVideosCore.validateCatalog(initialCatalog).items.find((entry) => entry.url === url);
    const editor = page.document.getElementById("input_envio_msg"); editor.textContent = "Olá, cliente!";
    let sent = 0; page.document.getElementById("fixture-send").addEventListener("click", () => sent++);
    panel.querySelector(".sv-primary").click(); await page.settle();
    assert.equal(readableText(editor), `Olá, cliente!\n\nEste vídeo pode ajudar:\n${item.displayTitle}\n${url}`);
    assert.equal(sent, 0);
  } finally { page.close(); }
});

const treeIndexPath = process.env.SPEEDVIDEOS_TREE_INDEX || path.join(__dirname, "fixtures", "drive", "index.json");
test("full tree refresh matches the public Oct 8 snapshots and excludes review folders and PDFs", { skip: !fs.existsSync(treeIndexPath) }, async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    const index = JSON.parse(fs.readFileSync(treeIndexPath, "utf8"));
    for (const area of index) for (const folder of area.folders) {
      page.setFolderHtml(folder.folderId, fs.readFileSync(path.resolve(path.dirname(treeIndexPath), folder.file), "utf8"));
    }
    const result = await page.window.SpeedVideosView.refreshCatalogs();
    assert.equal(result.failed.length, 0);
    for (const [areaId, expected] of [["fiscal", initialCatalog], ["estoque", stockCatalog], ["financeiro", financeCatalog], ["integracoes", integrationsCatalog]]) {
      const catalog = result.state.catalogs[areaId];
      assert.deepEqual([...catalog.items.map((item) => item.id)].sort(), expected.items.map((item) => item.id).sort());
      assert.equal(catalog.ignoredFolders.length, areaId === "financeiro" ? 0 : 1);
      assert.ok(catalog.items.every((item) => !/\.pdf$/i.test(item.originalFilename)));
    }
    assert.equal(result.state.catalogs.estoque.folders.length, 3);
    const requested = new Set(page.requests.filter((request) => request.type === "SV_FETCH_FOLDER").map((request) => request.folderId));
    for (const area of index) for (const ignored of area.ignoredFolders) assert.equal(requested.has(ignored.folderId), false);
  } finally { page.close(); }
});

test("finance catalog preserves 290 public links from the main root, including all 31 contracts", () => {
  const core = coreContext(); const catalog = core.validateCatalog(financeCatalog, "financeiro");
  assert.equal(catalog.items.length, 290); assert.equal(catalog.source.folderId, "1PPy8Ny8J1WQbziEbVLF9JhZBUP1pTEDC");
  assert.equal(catalog.source.name, "2026 Financeiro - Speed Videos Suporte");
  assert.equal(catalog.folders.length, 33); assert.equal(contractItems.length, 31);
  assert.ok(catalog.items.some((entry) => entry.folderPath.split(" / ").length === 4));
  for (let index = 0; index < 290; index++) assert.equal(catalog.items[index].url, financeCatalog.items[index].url);
  const item = core.itemFromFile("[Contratos | Descontos] Como configurar o desconto.mp4", "https://drive.google.com/file/d/finance-test/view", "Financeiro");
  assert.equal(item.title, "Como configurar o desconto"); assert.equal(item.topic, "Contratos | Descontos");
  assert.equal(core.messageFor(item, true, "Confira este tutorial:"), "Confira este tutorial:\nContratos | Descontos | Como configurar o desconto\nhttps://drive.google.com/file/d/finance-test/view");
  assert.ok(core.search(catalog.items, "descontos").length > 0);
});

test("a version 0.4 installation gains Finance without replacing existing catalogs or personal preferences", async () => {
  const previous = { catalogs: { fiscal: clone(initialCatalog), estoque: clone(stockCatalog) },
    activeArea: "estoque", favorites: [stockCatalog.items[0].id], introduction: "Minha mensagem:", opaOrigin: origin };
  const worker = workerHarness(previous); await worker.lifecycle("onInstalled");
  assert.deepEqual(worker.stored, previous);
  const { state } = await worker.send({ type: "SV_STATE" });
  assert.equal(state.catalogs.financeiro.items.length, 290); assert.equal(state.activeArea, "estoque");
  assert.equal(state.introduction, "Minha mensagem:");
  const selected = await worker.send({ type: "SV_SET_AREA", areaId: "financeiro" });
  assert.equal(selected.ok, true); assert.equal(selected.state.catalog.items.length, 290);
  await worker.send({ type: "SV_FAVORITE", id: financeCatalog.items[0].id });
  assert.ok(worker.stored.favorites.includes(stockCatalog.items[0].id)); assert.ok(worker.stored.favorites.includes(financeCatalog.items[0].id));
  await worker.send({ type: "SV_SAVE_CATALOG", areaId: "financeiro", catalog: financeCatalog });
  assert.deepEqual(worker.stored.catalogs.fiscal, previous.catalogs.fiscal);
  assert.deepEqual(worker.stored.catalogs.estoque, previous.catalogs.estoque);
});

test("finance can be entirely in subfolders and stays in one flat list with query search limited to that sector", async () => {
  const page = pageHarness(`${origin}/chat`, '<main id="app"></main>');
  try {
    const { state: previous } = await page.window.SpeedVideosView.send({ type: "SV_STATE" });
    page.setState({ ...previous, catalogs: { ...previous.catalogs,
      financeiro: { ...clone(financeCatalog), items: clone(contractItems), itemCount: 31 } } });
    const rootId = page.window.SpeedVideosCore.areaConfig("financeiro").folderId;
    const query = page.window.SpeedVideosCore.itemFromFile("Query | Cobranças pendentes.webm", "https://drive.google.com/file/d/finance-query/view", "Financeiro");
    page.setFolderHtml(rootId, folderPage([], [
      { id: "finance-contracts", name: "Contratos" }, { id: "finance-queries", name: "Query Builder" }, { id: "finance-skipped", name: "Regravar" }
    ]));
    page.setFolderHtml("finance-contracts", folderPage(contractItems)); page.setFolderHtml("finance-queries", folderPage([query]));
    page.run("popup.js"); await page.settle();
    const sector = page.document.querySelector(".sv-sector-select"); sector.value = "financeiro";
    sector.dispatchEvent(new page.window.Event("change")); await page.settle();
    assert.equal(page.document.querySelectorAll(".sv-card").length, 31);
    assert.equal(page.document.querySelectorAll("select").length, 1);
    assert.equal(page.document.querySelector('select[aria-label="Assunto do vídeo"]'), null);
    page.document.querySelector(".sv-refresh").click(); await page.settle();
    assert.equal(page.document.querySelectorAll(".sv-list > .sv-card").length, 32);
    const input = page.document.querySelector('input[type="search"]'); input.value = "query";
    input.dispatchEvent(new page.window.Event("input"));
    assert.equal(page.document.querySelectorAll(".sv-card").length, 1);
    assert.ok(page.document.querySelector(".sv-link").href.includes("finance-query"));
    const { state } = await page.window.SpeedVideosView.send({ type: "SV_STATE" });
    assert.equal(state.catalogs.financeiro.folders.length, 3); assert.equal(state.catalogs.financeiro.ignoredFolders.length, 1);
    assert.equal(page.requests.some((request) => request.folderId === "finance-skipped"), false);
    assert.match(page.document.querySelector(".sv-status").textContent, /Financeiro: 1 novo vídeo/);
  } finally { page.close(); }
});

test("options offers Finance and refreshes that sector without touching the others", async () => {
  const page = pageHarness(`${origin}/chat`, source("options.html"));
  try {
    page.window.chrome.permissions = { request: async () => true }; page.run("options.js"); await page.settle();
    const sector = page.document.getElementById("catalog-area"); assert.equal(sector.options.length, coreContext().areas.length);
    sector.value = "financeiro"; sector.dispatchEvent(new page.window.Event("change"));
    assert.match(page.document.getElementById("catalog-info").textContent, /Financeiro: 290/);
    assert.equal(page.document.getElementById("folder-link").textContent, "2026 Financeiro - Speed Videos Suporte");
    assert.equal(page.document.getElementById("folder-link").href, financeCatalog.source.url);
    page.document.getElementById("update").click(); await page.settle();
    const saved = page.requests.filter((request) => request.type === "SV_SAVE_CATALOG");
    assert.equal(saved.length, 1); assert.equal(saved[0].areaId, "financeiro");
  } finally { page.close(); }
});

function legacyFinanceCatalog() {
  return { ...clone(financeCatalog), source: { name: "Contratos", folderId: legacyFinanceFolderId,
    url: `https://drive.google.com/drive/folders/${legacyFinanceFolderId}` },
    items: clone(contractItems), itemCount: 31,
    folders: [{ folderId: legacyFinanceFolderId, path: "Financeiro" }], ignoredFolders: [] };
}
function legacyFinanceStorage() {
  return { catalogs: { fiscal: clone(initialCatalog), estoque: clone(stockCatalog), financeiro: legacyFinanceCatalog() },
    favorites: [initialCatalog.items[0].id, stockCatalog.items[0].id, contractItems[0].id],
    activeArea: "financeiro", introduction: "Minha orientação personalizada:", opaOrigin: origin,
    lastSyncByArea: { fiscal: "2026-10-07T10:00:00Z", estoque: "2026-10-07T11:00:00Z", financeiro: "2026-10-08T10:00:00Z" } };
}

test("version 0.5 cached Finance remains readable before lifecycle migration without changing stored preferences", async () => {
  const previous = legacyFinanceStorage(); const worker = workerHarness(previous);
  const response = await worker.send({ type: "SV_STATE" });
  assert.equal(response.ok, true);
  const state = response.state;
  assert.equal(state.catalog.source.folderId, financeCatalog.source.folderId);
  assert.equal(state.catalog.itemCount, 290); assert.equal(state.lastSync, null);
  assert.equal(state.activeArea, "financeiro"); assert.equal(state.introduction, previous.introduction);
  assert.deepEqual([...state.favorites], previous.favorites);
  assert.equal(state.lastSyncByArea.fiscal, previous.lastSyncByArea.fiscal);
  assert.equal(state.lastSyncByArea.estoque, previous.lastSyncByArea.estoque);
  assert.ok(state.favorites.every((id) => Object.values(state.catalogs).some((catalog) => catalog.items.some((item) => item.id === id))));
  assert.deepEqual(worker.stored, previous); assert.equal(worker.network.length, 0);
});

test("updating version 0.5 replaces only the contracts catalog and its sync date, preserving an explicit disable", async () => {
  const previous = legacyFinanceStorage(); previous.opaOrigin = "";
  const worker = workerHarness(previous); await worker.lifecycle("onInstalled");
  const expected = clone(previous); expected.catalogs.financeiro = clone(financeCatalog); expected.lastSyncByArea.financeiro = null;
  assert.deepEqual(worker.stored, expected);
  assert.equal(worker.registered.size, 0); assert.equal(worker.injections.length, 0);
  assert.equal(worker.permissionRequests.length, 0); assert.equal(worker.network.length, 0);
  const state = (await worker.send({ type: "SV_STATE" })).state;
  assert.equal(state.catalog.itemCount, 290); assert.equal(state.opaOrigin, "");
});

test("startup migrates old Finance once and preserves later full-root updates on the next startup", async () => {
  const previous = legacyFinanceStorage(); const worker = workerHarness(previous);
  await worker.lifecycle("onStartup");
  assert.equal(worker.stored.catalogs.financeiro.source.folderId, financeCatalog.source.folderId);
  assert.equal(worker.stored.catalogs.financeiro.itemCount, 290);
  const updated = withNewVideo(financeCatalog, "financeiro");
  assert.equal((await worker.send({ type: "SV_SAVE_CATALOG", areaId: "financeiro", catalog: updated })).ok, true);
  const saved = clone(worker.stored); await worker.lifecycle("onStartup");
  assert.deepEqual(worker.stored, saved);
  assert.equal(worker.stored.catalogs.financeiro.itemCount, 291);
  assert.deepEqual(worker.stored.favorites, previous.favorites); assert.equal(worker.stored.introduction, previous.introduction);
  assert.equal(worker.injections.length, 0); assert.equal(worker.network.length, 0);
});

test("Finance refresh starts at the main folder, permits Contracts only after discovery and rejects obsolete catalog saves", async () => {
  const worker = workerHarness(); worker.allowed.add("https://drive.google.com/*");
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "financeiro", folderId: legacyFinanceFolderId })).ok, false);
  worker.setFolderResponse({ ok: true, url: "https://drive.google.com/embeddedfolderview", text: async () => folderPage([], [
    { id: legacyFinanceFolderId, name: "Contratos" }
  ]) }, financeCatalog.source.folderId);
  worker.setFolderResponse({ ok: true, url: "https://drive.google.com/embeddedfolderview", text: async () => folderPage(contractItems) }, legacyFinanceFolderId);
  const scan = await worker.send({ type: "SV_FETCH_FOLDER", areaId: "financeiro" });
  assert.equal(scan.ok, true);
  assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: "financeiro", folderId: legacyFinanceFolderId, scanId: scan.scanId })).ok, true);
  assert.deepEqual(worker.network.map((request) => new URL(request.url).searchParams.get("id")), [financeCatalog.source.folderId, legacyFinanceFolderId]);
  assert.equal((await worker.send({ type: "SV_SAVE_CATALOG", areaId: "financeiro", catalog: legacyFinanceCatalog() })).ok, false);
  const unrelated = clone(financeCatalog); unrelated.source.folderId = "unrelated-finance-folder";
  assert.equal((await worker.send({ type: "SV_SAVE_CATALOG", areaId: "financeiro", catalog: unrelated })).ok, false);
  assert.equal(worker.stored.catalogs, undefined);
});

function connectedPage(worker, html = '<main id="app"></main>', inChat = false) {
  const page = pageHarness(origin + "/chat", html);
  page.window.chrome.runtime.sendMessage = (message) => {
    page.requests.push(message);
    return worker.send(message, inChat ? origin + "/chat" : extensionBase + "popup.html",
      inChat ? { tab: { id: 1 }, frameId: 0 } : {});
  };
  page.window.chrome.storage.onChanged = worker.storageChanges;
  page.window.chrome.permissions = { request: async () => (await worker.send({ type: "SV_REQUEST_DRIVE" })).granted };
  return page;
}
function setPublicPage(worker, folderId, items = [], folders = []) {
  worker.setFolderResponse({ ok: true, url: "https://drive.google.com/embeddedfolderview",
    text: async () => folderPage(items, folders) }, folderId);
}
function personalVideo(id = "personal-video", name = "Assunto | Tutorial do mês.mp4") {
  return coreContext().itemFromFile(name, "https://drive.google.com/file/d/" + id + "/view", "Materiais do mês");
}
async function addFixtureFolder(worker, page, id = "monthly-folder", label = "Materiais do mês") {
  setPublicPage(worker, id, [personalVideo()]);
  return page.window.SpeedVideosView.addPersonalFolder("https://drive.google.com/drive/folders/" + id, label);
}

test("personal folder URLs accept common Drive forms and reject file links, foreign hosts and credentials", () => {
  const core = coreContext();
  for (const link of ["https://drive.google.com/drive/folders/monthly-folder?usp=sharing",
    "https://drive.google.com/drive/u/0/folders/monthly-folder/"]) {
    const folder = core.personalFolderFromUrl(link, "  Outubro  ");
    assert.equal(folder.id, "personal-monthly-folder"); assert.equal(folder.label, "Outubro");
    assert.equal(folder.folderUrl, "https://drive.google.com/drive/folders/monthly-folder");
  }
  for (const link of ["javascript:alert(1)", "http://drive.google.com/drive/folders/no",
    "https://drive.google.com.evil.test/drive/folders/no", "https://user:pass@drive.google.com/drive/folders/no",
    "https://drive.google.com:8443/drive/folders/no", "https://drive.google.com/file/d/no/view",
    "https://drive.google.com/drive/folders/a/another"]) assert.throws(() => core.personalFolderFromUrl(link));
  assert.throws(() => core.personalFolderFromUrl("https://drive.google.com/drive/folders/monthly-folder", "a".repeat(101)));
});

test("adding a personal folder scans descendants, ignores review branches, deduplicates and stays local", async () => {
  const previous = { catalogs: { fiscal: initialCatalog, estoque: stockCatalog, financeiro: financeCatalog },
    favorites: [initialCatalog.items[0].id], introduction: "Meu texto:", opaOrigin: "" };
  const worker = workerHarness(previous); const page = connectedPage(worker);
  try {
    const first = personalVideo(), second = personalVideo("personal-second", "Query | Consulta específica.mp4");
    setPublicPage(worker, "monthly-folder", [first], [
      { id: "monthly-child", name: "Relatórios" }, { id: "monthly-skip", name: "FORA DE CONTEXTO" } ]);
    setPublicPage(worker, "monthly-child", [first, second], [
      { id: "monthly-folder", name: "Voltar" }, { id: "monthly-regravar", name: "Regrávar - antigos" } ]);
    const result = await page.window.SpeedVideosView.addPersonalFolder("https://drive.google.com/drive/folders/monthly-folder", "Outubro");
    assert.equal(result.state.activeArea, "personal-monthly-folder");
    assert.equal(result.state.catalog.items.length, 2); assert.equal(result.state.catalog.folders.length, 2);
    assert.equal(result.state.catalog.ignoredFolders.length, 2); assert.equal(result.state.areas.length, coreContext().areas.length + 1);
    assert.ok(page.window.SpeedVideosCore.search(result.state.catalog.items, "relatorios").some((item) => item.id === second.id));
    assert.deepEqual(worker.stored.catalogs.fiscal, previous.catalogs.fiscal);
    assert.deepEqual(worker.stored.catalogs.estoque, previous.catalogs.estoque);
    assert.deepEqual(worker.stored.catalogs.financeiro, previous.catalogs.financeiro);
    assert.equal(result.state.introduction, previous.introduction); assert.equal(result.state.opaOrigin, "");
    assert.equal(worker.network.length, 2);
    assert.ok(worker.network.every((request) => request.options.credentials === "omit"));
    const otherUser = (await workerHarness().send({ type: "SV_STATE" })).state;
    assert.equal(otherUser.personalFolders.length, 0); assert.equal(otherUser.areas.length, coreContext().areas.length);
  } finally { page.close(); }
});

test("duplicate personal folders and fixed sector roots are rejected before another request", async () => {
  const worker = workerHarness(); const page = connectedPage(worker);
  try {
    await addFixtureFolder(worker, page);
    const requestsBefore = worker.network.length;
    await assert.rejects(page.window.SpeedVideosView.addPersonalFolder(
      "https://drive.google.com/drive/u/2/folders/monthly-folder?usp=sharing", "Outro nome"), /já está/);
    await assert.rejects(page.window.SpeedVideosView.addPersonalFolder(initialCatalog.source.url, "Meu fiscal"), /já está/);
    assert.equal(worker.network.length, requestsBefore); assert.equal(worker.stored.personalFolders.length, 1);
  } finally { page.close(); }
});

test("failed login or required descendant does not partially add a personal folder", async () => {
  const worker = workerHarness({ favorites: [initialCatalog.items[0].id], introduction: "Olá:" });
  const page = connectedPage(worker);
  try {
    worker.setFolderResponse({ ok: true, url: "https://accounts.google.com/login", text: async () => "<h1>Login</h1>" }, "private-folder");
    await assert.rejects(page.window.SpeedVideosView.addPersonalFolder("https://drive.google.com/drive/folders/private-folder", "Privada"), /não respondeu/);
    setPublicPage(worker, "monthly-folder", [personalVideo()], [{ id: "private-child", name: "Necessária" }]);
    await assert.rejects(page.window.SpeedVideosView.addPersonalFolder("https://drive.google.com/drive/folders/monthly-folder", "Outubro"), /private|Necessária|não respondeu/);
    assert.equal(worker.stored.personalFolders, undefined); assert.equal(worker.stored.catalogs, undefined);
    assert.equal(worker.stored.activeArea, undefined); assert.equal(worker.stored.introduction, "Olá:");
    assert.deepEqual(worker.stored.favorites, [initialCatalog.items[0].id]);
  } finally { page.close(); }
});

test("refused permission and invalid links make no Drive requests or personal writes", async () => {
  const worker = workerHarness(); const page = connectedPage(worker); worker.setPermissionGranted(false);
  try {
    await assert.rejects(page.window.SpeedVideosView.addPersonalFolder("https://example.com/drive/folders/monthly-folder", "Mês"), /link de pasta/);
    assert.equal(worker.permissionRequests.length, 0);
    await assert.rejects(page.window.SpeedVideosView.addPersonalFolder("https://drive.google.com/drive/folders/monthly-folder", "Mês"), /não foi permitida/);
    assert.equal(worker.network.length, 0); assert.deepEqual(worker.stored, {});
  } finally { page.close(); }
});

test("accessible empty personal folders can be saved and populated on a later refresh", async () => {
  const worker = workerHarness(); const page = connectedPage(worker);
  try {
    setPublicPage(worker, "empty-personal");
    let result = await page.window.SpeedVideosView.addPersonalFolder("https://drive.google.com/drive/folders/empty-personal", "Vazia");
    assert.equal(result.state.catalog.items.length, 0);
    setPublicPage(worker, "empty-personal", [personalVideo()]);
    const catalog = await page.window.SpeedVideosView.readCatalogTree(result.state.personalFolders[0]);
    result = await worker.send({ type: "SV_SAVE_CATALOG", areaId: catalog.areaId, catalog, scanId: catalog.scanId });
    assert.equal(result.ok, true); assert.equal(result.state.catalog.items.length, 1);
  } finally { page.close(); }
});

test("refresh includes personal folders, discovers additions and preserves them when a later response fails", async () => {
  const worker = workerHarness(); const page = connectedPage(worker);
  try {
    const added = await addFixtureFolder(worker, page);
    await worker.send({ type: "SV_FAVORITE", id: "personal-video" });
    for (const area of coreContext().areas) setPublicPage(worker, area.folderId, [initialCatalog.items[0]]);
    setPublicPage(worker, "monthly-folder", [personalVideo(), personalVideo("monthly-new", "Extra | Novo tutorial.mp4")]);
    let result = await page.window.SpeedVideosView.refreshCatalogs();
    const personal = result.updated.find((area) => area.areaId === added.state.activeArea);
    assert.equal(personal.added, 1); assert.equal(personal.total, 2); assert.equal(result.failed.length, 0);
    assert.equal(result.state.activeArea, added.state.activeArea); assert.ok(result.state.favorites.includes("personal-video"));
    const saved = clone(worker.stored.catalogs[added.state.activeArea]);
    worker.setFolderResponse({ ok: false, url: "https://drive.google.com/embeddedfolderview", text: async () => "" }, "monthly-folder");
    result = await page.window.SpeedVideosView.refreshCatalogs();
    assert.equal(result.failed.length, 1); assert.equal(result.failed[0].areaId, added.state.activeArea);
    assert.deepEqual(worker.stored.catalogs[added.state.activeArea], saved);
    assert.equal(result.updated.length, coreContext().areas.length);
  } finally { page.close(); }
});

test("removing the selected folder removes its cached data, returns to Fiscal and stops future requests", async () => {
  const worker = workerHarness({ favorites: [initialCatalog.items[0].id], introduction: "Meu texto:" });
  const page = connectedPage(worker);
  try {
    const added = await addFixtureFolder(worker, page);
    await worker.send({ type: "SV_FAVORITE", id: "personal-video" });
    const removed = await worker.send({ type: "SV_REMOVE_FOLDER", areaId: added.state.activeArea });
    assert.equal(removed.ok, true); assert.equal(removed.state.personalFolders.length, 0);
    assert.equal(removed.state.activeArea, "fiscal");
    assert.equal(worker.stored.catalogs[added.state.activeArea], undefined);
    assert.equal(worker.stored.lastSyncByArea[added.state.activeArea], undefined);
    assert.equal(removed.state.introduction, "Meu texto:"); assert.ok(removed.state.favorites.includes("personal-video"));
    for (const area of coreContext().areas) setPublicPage(worker, area.folderId, [initialCatalog.items[0]]);
    const before = worker.network.length;
    await page.window.SpeedVideosView.refreshCatalogs();
    assert.equal(worker.network.slice(before).some((request) => new URL(request.url).searchParams.get("id") === "monthly-folder"), false);
    assert.equal((await worker.send({ type: "SV_REMOVE_FOLDER", areaId: "fiscal" })).ok, false);
    assert.equal((await worker.send({ type: "SV_SET_AREA", areaId: added.state.activeArea })).ok, false);
  } finally { page.close(); }
});

test("removing an unselected personal folder retains the selected sector and rejects stale saves", async () => {
  const worker = workerHarness(); const page = connectedPage(worker);
  try {
    const added = await addFixtureFolder(worker, page);
    const area = added.state.personalFolders[0];
    const stale = await page.window.SpeedVideosView.readCatalogTree(area);
    await worker.send({ type: "SV_SET_AREA", areaId: "estoque" });
    await worker.send({ type: "SV_REMOVE_FOLDER", areaId: area.id });
    assert.equal((await worker.send({ type: "SV_STATE" })).state.activeArea, "estoque");
    const result = await worker.send({ type: "SV_SAVE_CATALOG", areaId: area.id, catalog: stale, scanId: stale.scanId });
    assert.equal(result.ok, false); assert.equal(worker.stored.catalogs[area.id], undefined);
    const fresh = await addFixtureFolder(worker, page);
    assert.equal(fresh.state.favorites.length, 0);
    assert.equal((await worker.send({ type: "SV_SAVE_CATALOG", areaId: area.id, catalog: stale, scanId: stale.scanId })).ok, false);
    assert.equal(worker.stored.catalogs[area.id].items.length, 1);
  } finally { page.close(); }
});

test("personal scans reject arbitrary descendants, mismatched roots and forged add requests", async () => {
  const worker = workerHarness(); worker.allowed.add("https://drive.google.com/*");
  const core = coreContext(); const folder = core.personalFolderFromUrl("https://drive.google.com/drive/folders/monthly-folder", "Mês");
  setPublicPage(worker, "monthly-folder", [personalVideo()], [{ id: "ignored-child", name: "Regravar" }]);
  const scan = await worker.send({ type: "SV_FETCH_FOLDER", areaId: folder.id, personalFolder: folder });
  assert.equal(scan.ok, true);
  for (const child of ["unknown-child", "ignored-child"]) {
    assert.equal((await worker.send({ type: "SV_FETCH_FOLDER", areaId: folder.id, personalFolder: folder,
      folderId: child, scanId: scan.scanId })).ok, false);
  }
  const catalog = core.catalogFromTree([personalVideo()], folder);
  assert.equal((await worker.send({ type: "SV_ADD_FOLDER", folder, catalog, scanId: "forged" })).ok, false);
  const wrong = clone(catalog); wrong.source.folderId = "another-root";
  assert.equal((await worker.send({ type: "SV_ADD_FOLDER", folder, catalog: wrong, scanId: scan.scanId })).ok, false);
  assert.equal(worker.stored.personalFolders, undefined); assert.equal(worker.network.length, 1);
});

test("personal folder changes are rejected from unrelated origins, frames and a disabled chat", async () => {
  const worker = workerHarness({ opaOrigin: "" });
  const folder = coreContext().personalFolderFromUrl("https://drive.google.com/drive/folders/monthly-folder", "Mês");
  const messages = [{ type: "SV_FETCH_FOLDER", areaId: folder.id, personalFolder: folder },
    { type: "SV_ADD_FOLDER", folder }, { type: "SV_REMOVE_FOLDER", areaId: folder.id }];
  for (const message of messages) {
    assert.equal((await worker.send(message, "https://other.example/", { tab: { id: 1 }, frameId: 0 })).ok, false);
    assert.equal((await worker.send(message, origin + "/chat", { tab: { id: 1 }, frameId: 1 })).ok, false);
    assert.equal((await worker.send(message, origin + "/chat", { tab: { id: 1 }, frameId: 0 })).ok, false);
  }
  assert.equal(worker.network.length, 0); assert.equal(worker.stored.personalFolders, undefined);
});

test("personal catalogs, favorites and selection survive extension startup and an update", async () => {
  const worker = workerHarness({ introduction: "Minha mensagem:" }); const page = connectedPage(worker);
  try {
    const added = await addFixtureFolder(worker, page);
    await worker.send({ type: "SV_FAVORITE", id: "personal-video" });
    const restarted = workerHarness(worker.stored);
    await restarted.lifecycle("onInstalled"); await restarted.lifecycle("onStartup");
    const state = (await restarted.send({ type: "SV_STATE" })).state;
    assert.equal(state.personalFolders.length, 1); assert.equal(state.activeArea, added.state.activeArea);
    assert.equal(state.catalog.items.length, 1); assert.equal(state.introduction, "Minha mensagem:");
    assert.ok(state.favorites.includes("personal-video")); assert.equal(restarted.network.length, 0);
  } finally { page.close(); }
});

test("popup form adds a named folder, switches to it, copies its link and removes it", async () => {
  const worker = workerHarness(); const page = connectedPage(worker);
  try {
    setPublicPage(worker, "monthly-folder", [personalVideo()]);
    let copied; page.window.navigator.clipboard = { writeText: async (text) => { copied = text; } };
    page.run("popup.js"); await page.settle();
    assert.equal(page.document.querySelector(".sv-personal").open, false);
    page.document.querySelector(".sv-personal").open = true;
    page.document.querySelector('input[type="url"]').value = "https://drive.google.com/drive/folders/monthly-folder";
    page.document.querySelector('input[type="text"]').value = "Outubro";
    page.document.querySelector(".sv-folder-form").dispatchEvent(new page.window.Event("submit", { cancelable: true }));
    await page.settle(); await page.settle();
    const select = page.document.querySelector(".sv-sector-select");
    assert.equal(select.value, "personal-monthly-folder"); assert.equal(select.options.length, coreContext().areas.length + 1);
    assert.equal(select.querySelector('optgroup[label="Pastas pessoais"]').querySelectorAll("option").length, 1);
    assert.equal(page.document.querySelectorAll(".sv-card").length, 1);
    assert.match(page.document.querySelector(".sv-status").textContent, /adicionada/);
    [...page.document.querySelectorAll(".sv-card button")].find((button) => button.textContent === "Copiar link").click();
    await page.settle(); assert.equal(copied, personalVideo().url);
    page.document.querySelector(".sv-personal").open = true;
    page.document.querySelector(".sv-remove-folder").click(); await page.settle();
    assert.equal(select.options.length, coreContext().areas.length); assert.equal(select.value, "fiscal");
    assert.match(page.document.querySelector(".sv-status").textContent, /removida/);
    assert.equal(worker.stored.personalFolders.length, 0);
  } finally { page.close(); }
});

test("personal folder titles are rendered as text and chat insertion keeps the draft and individual message", async () => {
  const worker = workerHarness({ introduction: "Veja este vídeo:" }); const popup = connectedPage(worker);
  const page = connectedPage(worker, fixture, true);
  try {
    await addFixtureFolder(worker, popup, "monthly-folder", 'Outubro <img src="x">');
    page.run("content.js"); await page.settle();
    page.document.getElementById("opa-speedvideos-trigger").shadowRoot.querySelector("button").click(); await page.settle();
    const panel = page.document.getElementById("opa-speedvideos-panel").shadowRoot;
    assert.equal(panel.querySelector("img"), null);
    assert.ok(panel.querySelector(".sv-sector-select").selectedOptions[0].textContent.includes('<img src="x">'));
    const editor = page.document.getElementById("input_envio_msg"); editor.textContent = "Olá!";
    let sent = 0; page.document.getElementById("fixture-send").addEventListener("click", () => sent++);
    panel.querySelector(".sv-card .sv-primary").click(); await page.settle();
    assert.equal(readableText(editor), "Olá!\n\nVeja este vídeo:\nAssunto | Tutorial do mês\n" + personalVideo().url);
    assert.equal(sent, 0);
  } finally { popup.close(); page.close(); }
});

test("options starts on a personal catalog and refreshes it without replacing fixed sectors", async () => {
  const worker = workerHarness(); const popup = connectedPage(worker); let page;
  try {
    await addFixtureFolder(worker, popup);
    page = connectedPage(worker, source("options.html")); page.run("options.js"); await page.settle();
    assert.equal(page.document.getElementById("catalog-area").value, "personal-monthly-folder");
    assert.match(page.document.getElementById("catalog-info").textContent, /1 vídeos/);
    setPublicPage(worker, "monthly-folder", [personalVideo(), personalVideo("another-video")]);
    page.document.getElementById("update").click(); await page.settle(); await page.settle();
    assert.equal(worker.stored.catalogs["personal-monthly-folder"].items.length, 2);
    assert.equal(worker.stored.catalogs.fiscal, undefined); assert.equal(worker.stored.catalogs.estoque, undefined);
    assert.match(page.document.getElementById("update-status").textContent, /atualizado: 2 vídeos/);
  } finally { popup.close(); page?.close(); }
});

test("Integrations is the fourth bundled sector with all 149 original links and an excluded review folder", () => {
  const core = coreContext(); const catalog = core.validateCatalog(integrationsCatalog, "integracoes");
  assert.equal(core.areas.length, 4); assert.equal(core.areas[3].label, "Integrações Gerais");
  assert.equal(catalog.source.folderId, "1XPkYMIMtJJm1B0Wp2PMLwx5Wa_vYZ_LK");
  assert.equal(catalog.items.length, 149); assert.equal(catalog.folders.length, 1);
  assert.equal(catalog.ignoredFolders.length, 1);
  assert.ok(core.isIgnoredFolder(catalog.ignoredFolders[0].name));
  for (let i = 0; i < catalog.items.length; i++) assert.equal(catalog.items[i].url, integrationsCatalog.items[i].url);
  for (const query of ["api", "sva", "central assinante", "webhooks"]) assert.ok(core.search(catalog.items, query).length > 0, query);
  assert.throws(() => core.validateCatalog(initialCatalog, "integracoes"), /não corresponde/);
});

test("arrow and pipe date prefixes become clean Integration subjects and retain the complete title", () => {
  const core = coreContext(); const link = "https://drive.google.com/file/d/integration-example/view";
  for (const name of ["➡ | 07/10/2026 | Integrações | SVA | Configurar serviço.mp4",
    "➡️ |07/10/2026 | Integrações | SVA | Configurar serviço.mp4",
    "| 07/10/2026 | Integrações | SVA | Configurar serviço.mp4"]) {
    const item = core.itemFromFile(name, link, "Integrações Gerais");
    assert.equal(item.topic, "Integrações"); assert.equal(item.title, "SVA | Configurar serviço");
    assert.equal(item.dateInFilename, "2026-10-07"); assert.equal(item.originalFilename, name);
    assert.equal(core.messageFor(item, true, "Segue o tutorial:"), "Segue o tutorial:\nIntegrações | SVA | Configurar serviço\n" + link);
  }
  const api = core.itemFromFile("➡ | 23/04/2025 | API | Como gerar token e URL da API", link, "Integrações Gerais");
  assert.equal(api.topic, "API"); assert.equal(api.title, "Como gerar token e URL da API");
});

function previousPersonalIntegrations(items = [integrationsCatalog.items[0]]) {
  const core = coreContext();
  const personal = core.personalFolderFromUrl(integrationsCatalog.source.url, "Meus vídeos de integração");
  const other = core.personalFolderFromUrl("https://drive.google.com/drive/folders/unrelated-personal", "Outubro");
  const catalog = core.catalogFromTree(items.map((item) => ({ ...item, folderId: personal.folderId, folderPath: personal.label })),
    personal, [{ folderId: personal.folderId, path: personal.label }]);
  const otherCatalog = core.catalogFromTree([personalVideo("other-personal-video")], other);
  return { personal, other, stored: { personalFolders: [personal, other],
    catalogs: { fiscal: initialCatalog, estoque: stockCatalog, financeiro: financeCatalog, [personal.id]: catalog, [other.id]: otherCatalog },
    activeArea: personal.id, favorites: [items[0]?.id || "empty-previous-favorite", initialCatalog.items[0].id],
    introduction: "Mensagem da pessoa:", opaOrigin: "",
    lastSyncByArea: { [personal.id]: "2026-10-08T14:00:00Z", [other.id]: "2026-10-08T13:00:00Z" } } };
}

test("a 0.7 installation gains Integrations without modifying its saved catalogs, preferences or personal folders", async () => {
  const old = previousPersonalIntegrations(); delete old.stored.catalogs[old.personal.id];
  old.stored.personalFolders = [old.other]; old.stored.activeArea = old.other.id;
  const worker = workerHarness(old.stored); const previous = clone(old.stored);
  await worker.lifecycle("onInstalled");
  const state = (await worker.send({ type: "SV_STATE" })).state;
  assert.equal(state.catalogs.integracoes.items.length, 149); assert.equal(state.activeArea, old.other.id);
  assert.equal(state.personalFolders.length, 1); assert.equal(state.opaOrigin, "");
  assert.equal(state.introduction, previous.introduction); assert.deepEqual(worker.stored, previous);
});

test("an existing personal Integration root is promoted before state loads, preserving favorite IDs and other data", async () => {
  const previous = previousPersonalIntegrations(); const worker = workerHarness(previous.stored);
  const response = await worker.send({ type: "SV_STATE" });
  assert.equal(response.ok, true); const state = response.state;
  assert.equal(state.activeArea, "integracoes"); assert.equal(state.catalog.items.length, 1);
  assert.equal(state.catalog.areaId, "integracoes"); assert.equal(state.catalog.source.folderId, previous.personal.folderId);
  assert.equal(state.catalog.items[0].folderPath, "Integrações Gerais");
  assert.equal(state.personalFolders.length, 1); assert.equal(state.personalFolders[0].id, previous.other.id);
  assert.equal(worker.stored.catalogs[previous.personal.id], undefined);
  assert.equal(worker.stored.lastSyncByArea[previous.personal.id], undefined);
  assert.equal(state.lastSyncByArea.integracoes, "2026-10-08T14:00:00Z");
  assert.equal(state.opaOrigin, ""); assert.equal(state.introduction, previous.stored.introduction);
  assert.deepEqual(worker.stored.favorites, previous.stored.favorites);
  assert.deepEqual(worker.stored.catalogs.fiscal, previous.stored.catalogs.fiscal);
  assert.deepEqual(worker.stored.catalogs[previous.other.id], clone(previous.stored.catalogs[previous.other.id]));
  assert.equal(worker.network.length, 0); assert.equal(worker.permissionRequests.length, 0);
  await worker.lifecycle("onInstalled"); await worker.lifecycle("onStartup");
  assert.equal((await worker.send({ type: "SV_STATE" })).state.catalogs.integracoes.items.length, 1);
});

test("promotion retains an existing fixed Integration catalog and uses the bundle for an empty personal cache", async () => {
  const previous = previousPersonalIntegrations(); previous.stored.catalogs.integracoes = clone(integrationsCatalog);
  previous.stored.lastSyncByArea.integracoes = "2026-10-08T15:00:00Z";
  const worker = workerHarness(previous.stored); await worker.lifecycle("onInstalled");
  assert.equal(worker.stored.catalogs.integracoes.items.length, 149);
  assert.equal(worker.stored.lastSyncByArea.integracoes, "2026-10-08T15:00:00Z");
  const empty = previousPersonalIntegrations([]); const emptyWorker = workerHarness(empty.stored);
  assert.equal((await emptyWorker.send({ type: "SV_STATE" })).state.catalog.items.length, 149);
  assert.equal(emptyWorker.stored.lastSyncByArea.integracoes, null);
  assert.equal(emptyWorker.stored.personalFolders.length, 1);
});

test("Integration refresh discovers a new video, excludes the review folder and shows clean insertion in the popup", async () => {
  const worker = workerHarness({ introduction: "Confira:", favorites: [integrationsCatalog.items[0].id] });
  const page = connectedPage(worker);
  try {
    const area = coreContext().areaConfig("integracoes");
    const newItem = coreContext().itemFromFile("➡ | 08/10/2026 | API | Novo tutorial.mp4",
      "https://drive.google.com/file/d/new-integration-video/view", area.label);
    setPublicPage(worker, area.folderId, [...integrationsCatalog.items, newItem],
      [{ id: integrationsCatalog.ignoredFolders[0].folderId, name: integrationsCatalog.ignoredFolders[0].name }]);
    await worker.send({ type: "SV_REQUEST_DRIVE" });
    const catalog = await page.window.SpeedVideosView.readCatalogTree(area);
    assert.equal(catalog.items.length, 150); assert.equal(catalog.ignoredFolders.length, 1);
    assert.equal(worker.network.length, 1);
    const saved = await worker.send({ type: "SV_SAVE_CATALOG", areaId: area.id, catalog, scanId: catalog.scanId });
    assert.equal(saved.ok, true); assert.equal(worker.stored.catalogs.fiscal, undefined);
    await worker.send({ type: "SV_SET_AREA", areaId: "integracoes" });
    page.run("popup.js"); await page.settle();
    assert.equal(page.document.querySelector(".sv-sector-select").value, "integracoes");
    const search = page.document.querySelector('input[type="search"]'); search.value = "novo tutorial";
    search.dispatchEvent(new page.window.Event("input")); assert.equal(page.document.querySelectorAll(".sv-card").length, 1);
    page.document.querySelector(".sv-card .sv-primary").click(); await page.settle();
    const inserted = page.requests.findLast((request) => request.type === "SV_INSERT");
    assert.equal(inserted.text, "Confira:\nAPI | Novo tutorial\n" + newItem.url);
    assert.ok(saved.state.favorites.includes(integrationsCatalog.items[0].id));
  } finally { page.close(); }
});
