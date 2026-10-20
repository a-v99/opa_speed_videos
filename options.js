"use strict";
const core = SpeedVideosCore;
const ui = SpeedVideosView;
const opaStatus = document.getElementById("opa-status");
const updateStatus = document.getElementById("update-status");
const saveButton = document.getElementById("save");
const disableButton = document.getElementById("disable");
const updateButton = document.getElementById("update");
const info = document.getElementById("catalog-info");
const areaSelect = document.getElementById("catalog-area");
for (const area of core.areas) areaSelect.append(new Option(area.label, area.id));
const folderLink = document.getElementById("folder-link");
const introductionInput = document.getElementById("message-introduction");
const messagePreview = document.getElementById("message-preview");
const messageStatus = document.getElementById("message-status");
const saveMessageButton = document.getElementById("save-message");
const resetMessageButton = document.getElementById("reset-message");
const titleAreaSelect = document.getElementById("video-title-area");
const titleVideoSelect = document.getElementById("video-title-video");
const titleInput = document.getElementById("video-title-input");
const titleOriginal = document.getElementById("video-title-original");
const titleStatus = document.getElementById("video-title-status");
const saveTitleButton = document.getElementById("save-video-title");
const resetTitleButton = document.getElementById("reset-video-title");
let titleBusy = false;
let titleDirty = false;
let currentState;
function status(node, text, error = false) { node.textContent = text; node.dataset.error = String(error); }
function renderTitleEditor(resetDraft = false) {
  if (!currentState) return;
  const areas = currentState.areas || core.areas;
  const areaId = titleAreaSelect.value || currentState.activeArea || "fiscal";
  const selectedId = titleVideoSelect.value;
  titleAreaSelect.replaceChildren(...areas.map((area) => new Option(area.label, area.id)));
  titleAreaSelect.value = areas.some((area) => area.id === areaId) ? areaId : "fiscal";
  const items = [...(currentState.catalogs[titleAreaSelect.value]?.items || [])]
    .sort((a, b) => (a.displayTitle || a.title).localeCompare(b.displayTitle || b.title, "pt-BR"));
  titleVideoSelect.replaceChildren(...items.map((item) => new Option(item.displayTitle || item.title, item.id)));
  if (items.some((item) => item.id === selectedId)) titleVideoSelect.value = selectedId;
  const item = items.find((item) => item.id === titleVideoSelect.value);
  if (resetDraft || !titleDirty || selectedId !== titleVideoSelect.value || !item) {
    titleInput.value = item ? item.displayTitle || item.title : "";
    titleDirty = false;
  }
  if (!items.length) titleVideoSelect.append(new Option("Esta pasta ainda não tem vídeos", ""));
  titleOriginal.textContent = item ? `Nome original: ${item.originalFilename}` : "";
  titleAreaSelect.disabled = titleBusy;
  titleVideoSelect.disabled = titleInput.disabled = saveTitleButton.disabled = titleBusy || !item;
  resetTitleButton.disabled = titleBusy || !item?.hasCustomTitle;
}
async function changeVideoTitle(reset = false) {
  if (titleBusy || !titleVideoSelect.value) return;
  const id = titleVideoSelect.value;
  const title = titleInput.value;
  titleBusy = true; renderTitleEditor();
  try {
    const result = await ui.send({ type: reset ? "SV_RESET_VIDEO_TITLE" : "SV_SET_VIDEO_TITLE", id,
      ...(reset ? {} : { title }) });
    titleDirty = false;
    catalogInfo(result.state); renderTitleEditor(true);
    status(titleStatus, reset ? "Título padrão restaurado." : "Título salvo. Ele será mantido nas próximas atualizações.");
  } catch (error) { status(titleStatus, error.message, true); }
  finally { titleBusy = false; renderTitleEditor(); }
}
titleAreaSelect.addEventListener("change", () => {
  titleVideoSelect.value = ""; renderTitleEditor(true); status(titleStatus, "");
});
titleVideoSelect.addEventListener("change", () => { renderTitleEditor(true); status(titleStatus, ""); });
titleInput.addEventListener("input", () => { titleDirty = true; });
document.getElementById("video-title-form").addEventListener("submit", (event) => {
  event.preventDefault(); changeVideoTitle();
});
resetTitleButton.addEventListener("click", () => changeVideoTitle(true));
function previewMessage() {
  if (!currentState) return;
  const item = currentState.catalogs[areaSelect.value]?.items[0];
  messagePreview.textContent = item ? core.messageFor(item, true, introductionInput.value) : "Esta pasta ainda não contém vídeos para a prévia.";
}
function catalogInfo(state) {
  currentState = state;
  const selected = areaSelect.value || state.activeArea;
  const areas = state.areas || core.areas;
  areaSelect.replaceChildren(...areas.map((area) => new Option(area.label, area.id)));
  areaSelect.value = areas.some((area) => area.id === selected) ? selected : "fiscal";
  const area = core.areaConfig(areaSelect.value, state.personalFolders || []);
  const catalog = state.catalogs[area.id];
  const lastSync = state.lastSyncByArea[area.id];
  folderLink.href = area.folderUrl; folderLink.textContent = area.sourceName;
  const date = catalog.snapshotDate?.split("-").reverse().join("/") || "sem data";
  info.textContent = `${area.label}: ${catalog.items.length} vídeos · catálogo de ${date}.`;
  if (catalog.folders) info.textContent += ` ${catalog.folders.length} pasta${catalog.folders.length === 1 ? "" : "s"} consultada${catalog.folders.length === 1 ? "" : "s"}.`;
  if (catalog.ignoredFolders?.length) info.textContent += ` ${catalog.ignoredFolders.length} pasta${catalog.ignoredFolders.length === 1 ? "" : "s"} ignorada${catalog.ignoredFolders.length === 1 ? "" : "s"}.`;
  if (lastSync) info.textContent += ` Última atualização: ${new Date(lastSync).toLocaleString("pt-BR")}.`;
  previewMessage(); renderTitleEditor();
}
introductionInput.addEventListener("input", previewMessage);
document.getElementById("message-form").addEventListener("submit", async (event) => {
  event.preventDefault(); saveMessageButton.disabled = resetMessageButton.disabled = true;
  try {
    const result = await ui.send({ type: "SV_SET_MESSAGE", introduction: introductionInput.value });
    introductionInput.value = result.introduction; previewMessage();
    status(messageStatus, "Mensagem salva. Ela será usada ao inserir vídeos com mensagem e título.");
  } catch (error) { status(messageStatus, error.message, true); }
  finally { saveMessageButton.disabled = resetMessageButton.disabled = false; }
});
resetMessageButton.addEventListener("click", () => {
  introductionInput.value = core.defaultIntroduction; previewMessage();
  status(messageStatus, "Mensagem padrão carregada. Clique em Salvar mensagem para confirmar.");
});
areaSelect.addEventListener("change", () => { if (currentState) catalogInfo(currentState); status(updateStatus, ""); });
document.getElementById("opa-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = disableButton.disabled = true;
  try {
    const origin = core.opaOrigin;
    // Request permission directly from the user's click, before unrelated awaits.
    const granted = await chrome.permissions.request({ origins: [core.opaPattern] });
    if (!granted) throw new Error("O acesso ao endereço não foi permitido. Você pode continuar copiando links pelo ícone da extensão.");
    await ui.send({ type: "SV_SET_ORIGIN", origin });
    status(opaStatus, `Ativo em ${origin}. Abra um atendimento; se o botão não aparecer, recarregue a página do Opa!.`);
  } catch (error) { status(opaStatus, error.message, true); }
  finally { saveButton.disabled = disableButton.disabled = false; }
});
disableButton.addEventListener("click", async () => {
  saveButton.disabled = disableButton.disabled = true;
  try { await ui.send({ type: "SV_SET_ORIGIN", origin: "" }); status(opaStatus, "Integração desativada. O catálogo continua disponível no ícone da extensão."); }
  catch (error) { status(opaStatus, error.message, true); }
  finally { saveButton.disabled = disableButton.disabled = false; }
});
updateButton.addEventListener("click", async () => {
  const area = core.areaConfig(areaSelect.value, currentState?.personalFolders || []);
  updateButton.disabled = areaSelect.disabled = true;
  try {
    const granted = await chrome.permissions.request({ origins: ["https://drive.google.com/*"] });
    if (!granted) throw new Error("A consulta ao Google Drive não foi permitida. O catálogo anterior foi mantido.");
    status(updateStatus, `Lendo a pasta de ${area.label}…`);
    const catalog = await ui.readCatalogTree(area, (text) => status(updateStatus, text));
    const result = await ui.send({ type: "SV_SAVE_CATALOG", areaId: area.id, catalog, scanId: catalog.scanId }); catalogInfo(result.state);
    status(updateStatus, `${area.label} atualizado: ${result.state.catalogs[area.id].items.length} vídeos.`);
  } catch (error) { status(updateStatus, error.message, true); }
  finally { updateButton.disabled = areaSelect.disabled = false; }
});
ui.send({ type: "SV_STATE" }).then(({ state }) => {
  areaSelect.replaceChildren(...(state.areas || core.areas).map((area) => new Option(area.label, area.id)));
  areaSelect.value = state.activeArea;
  introductionInput.value = state.introduction ?? core.defaultIntroduction;
  status(opaStatus, state.opaOrigin ? `Ativo em ${core.opaOrigin}.` : "Integração desativada. Clique em Ativar no Opa! para voltar a usar o botão no chat.");
  catalogInfo(state);
}).catch((error) => { status(opaStatus, error.message, true); });
chrome.storage.onChanged.addListener((values, area) => {
  if (area !== "local" || !(values.personalFolders || values.catalogs || values.lastSyncByArea || values.videoTitles)) return;
  ui.send({ type: "SV_STATE" }).then(({ state }) => catalogInfo(state)).catch((error) => status(updateStatus, error.message, true));
});
