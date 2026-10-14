/* Adapter for the Opa! message editor identified in the supplied HTML. */
(() => {
  "use strict";
  const instanceKey = "__opaSpeedVideos";
  if (globalThis[instanceKey]) return;
  const core = SpeedVideosCore;
  const ui = SpeedVideosView;
  let stopped = false;
  let observer;
  let frame;
  let state;
  let editor;
  let triggerHost;
  let triggerButton;
  let panelHost;
  let panelView;
  let panelEpoch = 0;

  function findEditor() {
    return [...document.querySelectorAll('#input_envio_msg[contenteditable="true"]')]
      .find((node) => !node.closest('[hidden], [aria-hidden="true"]') && node.getClientRects().length > 0);
  }
  function closePanel(restoreFocus = false) {
    panelEpoch += 1;
    panelView?.destroy(); panelView = null;
    panelHost?.remove(); panelHost = null;
    triggerButton?.setAttribute("aria-expanded", "false");
    if (restoreFocus) triggerButton?.focus();
  }
  function insertText(text, expectedEditor) {
    if (stopped || location.origin !== core.opaOrigin || location.origin !== state?.opaOrigin) throw new Error("A integração com este endereço está desativada.");
    if (typeof text !== "string" || !text.trim() || text.length > 10000) throw new Error("A mensagem não é válida.");
    const target = findEditor();
    if (!target) throw new Error("Abra um atendimento com o campo de mensagem disponível.");
    if (expectedEditor && target !== expectedEditor) throw new Error("O atendimento mudou. Abra o menu de vídeos novamente.");
    const existing = target.innerText ?? target.textContent ?? "";
    const addition = `${existing.trim() ? "\n\n" : ""}${text}`;
    target.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target); range.collapse(false);
    selection.removeAllRanges(); selection.addRange(range);

    // Prefer the browser edit operation so native undo and input handlers participate.
    const before = target.innerHTML;
    let gotInput = false;
    const inputSeen = () => { gotInput = true; };
    target.addEventListener("input", inputSeen);
    try {
      if (typeof document.execCommand === "function") document.execCommand("insertText", false, addition);
      if (target.innerHTML === before) {
        const fragment = document.createDocumentFragment();
        addition.split("\n").forEach((line, index) => {
          if (index) fragment.append(document.createElement("br"));
          if (line) fragment.append(document.createTextNode(line));
        });
        range.insertNode(fragment);
        range.selectNodeContents(target); range.collapse(false);
        selection.removeAllRanges(); selection.addRange(range);
      }
      if (!gotInput) {
        let event;
        try { event = new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: addition }); }
        catch { event = new Event("input", { bubbles: true, composed: true }); }
        target.dispatchEvent(event);
      }
    } finally { target.removeEventListener("input", inputSeen); }
    // Sending belongs to the user: no Enter, send-button click or Opa API call.
  }
  async function togglePanel() {
    if (panelHost) { closePanel(true); return; }
    const expectedEditor = editor;
    const epoch = ++panelEpoch;
    triggerButton.disabled = true;
    try {
      const current = (await ui.send({ type: "SV_STATE" })).state;
      if (stopped || epoch !== panelEpoch || expectedEditor !== findEditor()) return;
      state = current;
      if (location.origin !== core.opaOrigin || location.origin !== state.opaOrigin) { destroy(); return; }
      panelHost = document.createElement("div");
      panelHost.id = "opa-speedvideos-panel";
      panelHost.style.cssText = "all:initial;position:fixed;right:16px;bottom:82px;width:min(520px,calc(100vw - 32px));height:min(650px,calc(100vh - 104px));height:min(650px,calc(100dvh - 104px));z-index:2147483646;display:block;";
      const shadow = panelHost.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `${state.css}\n.sv-shell{height:100%;box-shadow:0 12px 46px #0004;border-radius:14px;border:1px solid #73849a55;overflow:hidden;}`;
      const shell = document.createElement("div"); shell.className = "sv-shell";
      shell.setAttribute("role", "dialog"); shell.setAttribute("aria-label", "Speed Vídeos");
      shadow.append(style, shell); document.body.append(panelHost);
      panelView = ui.mount(shell, { state, onClose: () => closePanel(true),
        onInsert: async (text) => { insertText(text, expectedEditor); closePanel(); } });
      triggerButton.setAttribute("aria-expanded", "true"); panelView.focus();
    } catch (error) {
      console.error("Speed Vídeos:", error.message);
      if (triggerButton) triggerButton.title = `${error.message} Você também pode abrir a extensão pela barra do navegador.`;
    } finally { if (triggerButton) triggerButton.disabled = false; }
  }
  function makeTrigger() {
    triggerHost = document.createElement("span"); triggerHost.id = "opa-speedvideos-trigger";
    triggerHost.style.cssText = "all:initial;display:inline-flex;align-items:center;margin:0 4px;";
    const shadow = triggerHost.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = "button{box-sizing:border-box;font:600 12px/1.3 Arial,sans-serif;color:#185ec4;background:#eaf1ff;border:1px solid #b7cdf0;border-radius:7px;padding:7px 9px;cursor:pointer;white-space:nowrap}button:hover{background:#d9e7ff}button:focus-visible{outline:2px solid #185ec4;outline-offset:2px}button:disabled{opacity:.55;cursor:wait}";
    triggerButton = document.createElement("button"); triggerButton.type = "button";
    triggerButton.textContent = "Vídeos"; triggerButton.title = "Pesquisar Speed Vídeos";
    triggerButton.setAttribute("aria-haspopup", "dialog"); triggerButton.setAttribute("aria-expanded", "false");
    triggerButton.addEventListener("click", togglePanel); shadow.append(style, triggerButton);
  }
  function refresh() {
    frame = null;
    if (stopped) return;
    const current = findEditor();
    const toolbar = current?.closest(".message-sender")
      ?.querySelector(".message-sender-toolbar .message-sender-actions");
    if (current !== editor) { closePanel(); editor = current; }
    if (!toolbar) { triggerHost?.remove(); closePanel(); return; }
    if (!triggerHost) makeTrigger();
    if (triggerHost.parentNode !== toolbar) toolbar.append(triggerHost);
  }
  function schedule() { if (!stopped && frame == null) frame = requestAnimationFrame(refresh); }
  function outside(event) {
    if (!panelHost) return;
    const path = event.composedPath();
    if (!path.includes(panelHost) && !path.includes(triggerHost)) closePanel();
  }
  function escape(event) {
    if (panelHost && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closePanel(true); }
  }
  function changed(changes, area) {
    if (area === "local" && changes.opaOrigin && changes.opaOrigin.newValue !== location.origin) destroy();
  }
  function messageReceived(message, sender, respond) {
    if (sender.id !== chrome.runtime.id) return false;
    if (message?.type === "SV_DISABLE") { destroy(); respond({ ok: true }); return false; }
    if (message?.type !== "SV_INSERT") return false;
    try { insertText(message.text); closePanel(); respond({ ok: true }); }
    catch (error) { respond({ ok: false, error: error.message }); }
    return false;
  }
  function destroy() {
    if (stopped) return;
    stopped = true; closePanel(); observer?.disconnect();
    if (frame != null) cancelAnimationFrame(frame);
    triggerHost?.remove();
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", escape, true);
    chrome.storage.onChanged.removeListener(changed);
    chrome.runtime.onMessage.removeListener(messageReceived);
    if (globalThis[instanceKey] === instance) delete globalThis[instanceKey];
  }
  const instance = { destroy }; globalThis[instanceKey] = instance;
  ui.send({ type: "SV_STATE" }).then((response) => {
    if (stopped) return;
    state = response.state;
    if (location.origin !== core.opaOrigin || location.origin !== state.opaOrigin) { destroy(); return; }
    chrome.runtime.onMessage.addListener(messageReceived);
    chrome.storage.onChanged.addListener(changed);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden", "contenteditable"] });
    refresh();
  }).catch((error) => { console.error("Speed Vídeos:", error.message); destroy(); });
})();
