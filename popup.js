"use strict";
(async () => {
  const { state } = await SpeedVideosView.send({ type: "SV_STATE" });
  const view = SpeedVideosView.mount(document.getElementById("app"), { state,
    onInsert: async (text) => {
      const current = (await SpeedVideosView.send({ type: "SV_STATE" })).state;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let origin; try { origin = new URL(tab?.url).origin; } catch { origin = ""; }
      if (!current.opaOrigin || origin !== SpeedVideosCore.opaOrigin) {
        throw new Error("Abra um atendimento em https://suporte.ixcsoft.com.br com a integração ativa ou copie o link.");
      }
      let response;
      try { response = await chrome.tabs.sendMessage(tab.id, { type: "SV_INSERT", text }); }
      catch { throw new Error("Recarregue a página do Opa! e tente novamente."); }
      if (!response?.ok) throw new Error(response?.error || "O campo de mensagem não foi encontrado.");
    } });
  view.focus();
})().catch((error) => { document.getElementById("app").textContent = error.message; });
