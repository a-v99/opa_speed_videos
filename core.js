/* Shared data helpers. Remote HTML is treated exclusively as data. */
(() => {
  "use strict";
  const opaOrigin = "https://suporte.ixcsoft.com.br";
  const opaPattern = `${opaOrigin}/*`;
  const defaultIntroduction = "Segue o vídeo com o passo a passo:";
  const legacyFinanceFolderId = "1XGAO6zAHm89SjydOFn5VucEI4msZIoYg";
  const maxFolders = 100;
  const maxItems = 5000;
  const maxPersonalFolders = 20;
  const areas = [
    { id: "fiscal", label: "Fiscal", sourceName: "2026 Fiscal - Speed Videos Suporte",
      folderId: "19eincFNoNqrJajk3ez8Pn-_-8mBg0fZ8", bundledFile: "catalog.json",
      subtitle: "Fiscal · escolha e personalize", placeholder: "Pesquisar: NFCom, certificado, CFOP…" },
    { id: "estoque", label: "Estoque", sourceName: "Conf. Ordens de Serviço / Atendimentos / Processos",
      folderId: "1Is02Ons_d8KJ4n_C7E48zHLUgoIu8jhp", bundledFile: "catalog-estoque.json",
      subtitle: "O.S., atendimentos e processos", placeholder: "Pesquisar: OS, colaborador, comodato…" },
    { id: "financeiro", label: "Financeiro", sourceName: "2026 Financeiro - Speed Videos Suporte",
      folderId: "1PPy8Ny8J1WQbziEbVLF9JhZBUP1pTEDC", bundledFile: "catalog-financeiro.json",
      subtitle: "Financeiro · todos os temas", placeholder: "Pesquisar: contrato, cobrança, query…" },
    { id: "integracoes", label: "Integrações Gerais", sourceName: "2026  Integrações/API/Franquia - Speed Videos Suporte",
      folderId: "1XPkYMIMtJJm1B0Wp2PMLwx5Wa_vYZ_LK", bundledFile: "catalog-integracoes.json",
      subtitle: "Integrações, API e franquia", placeholder: "Pesquisar: API, SVA, central do assinante…" }
  ].map((area) => Object.freeze({ ...area,
    folderUrl: `https://drive.google.com/drive/folders/${area.folderId}`,
    folderFeed: `https://drive.google.com/embeddedfolderview?id=${area.folderId}#list` }));
  function areaConfig(id = "fiscal", personalFolders = []) {
    if (id && typeof id === "object") {
      return id.personal === true ? validatePersonalFolder(id) : areaConfig(id.id);
    }
    const area = areas.find((candidate) => candidate.id === id)
      || personalFolders.find((candidate) => candidate.id === id);
    if (!area) throw new Error("Área de vídeos desconhecida.");
    return area;
  }
  const { folderId, folderUrl, folderFeed } = areas[0];
  const normalize = (text) => String(text ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const isIgnoredFolder = (name) => /fora\s+(?:de|do)\s+contexto|regravar/.test(normalize(name));
  function folderFromLink(name, href) {
    let url; try { url = new URL(href); } catch { return null; }
    const match = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)\/?$/);
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com" || url.port || url.username || url.password || !match) return null;
    return { folderId: match[1], name: String(name).trim(), url: `https://drive.google.com/drive/folders/${match[1]}` };
  }
  function personalFolderFromUrl(raw, label = "Pasta pessoal") {
    if (typeof raw !== "string" || raw.length > 2000) throw new Error("Cole o link de uma pasta pública do Google Drive.");
    const folder = folderFromLink("", raw.trim());
    if (!folder) throw new Error("Cole um link de pasta: https://drive.google.com/drive/folders/ID_DA_PASTA.");
    if (typeof label !== "string" || label.trim().length > 100) throw new Error("O nome da pasta deve ter até 100 caracteres.");
    const name = label.trim() || "Pasta pessoal";
    if (isIgnoredFolder(name)) throw new Error("O nome da pasta contém um termo excluído: fora de contexto ou regravar.");
    return { id: `personal-${folder.folderId}`, label: name, sourceName: name,
      folderId: folder.folderId, folderUrl: folder.url,
      folderFeed: `https://drive.google.com/embeddedfolderview?id=${folder.folderId}#list`,
      personal: true, subtitle: "Pasta pessoal · vídeos e subpastas",
      placeholder: "Pesquisar nesta pasta…" };
  }
  function validatePersonalFolder(raw) {
    if (!raw || raw.personal !== true) throw new Error("Pasta pessoal inválida.");
    const folder = personalFolderFromUrl(raw.folderUrl, raw.label);
    if (raw.id !== folder.id || raw.folderId !== folder.folderId) throw new Error("Pasta pessoal inválida.");
    return folder;
  }
  function validatePersonalFolders(raw = []) {
    if (!Array.isArray(raw) || raw.length > maxPersonalFolders) throw new Error("A lista de pastas pessoais é inválida.");
    const seen = new Set(areas.map((area) => area.folderId));
    return raw.map((input) => {
      const folder = validatePersonalFolder(input);
      if (seen.has(folder.folderId)) throw new Error("Esta pasta já está cadastrada.");
      seen.add(folder.folderId);
      return folder;
    });
  }
  // The worker has no DOMParser. Only extract folder anchors; never execute HTML.
  function foldersInHtml(html) {
    const decode = (text) => text.replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[0-9a-f]+|[0-9]+);/gi, (entity) => {
      const named = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
      if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
      const hex = entity.slice(2, 3).toLowerCase() === "x";
      const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    });
    const folders = [];
    for (const match of html.matchAll(/<a\b[^>]*\s+href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi)) {
      const folder = folderFromLink(decode(match[3].replace(/<[^>]*>/g, " ")), decode(match[2]));
      if (folder) folders.push(folder);
    }
    return folders;
  }
  function validateIntroduction(value) {
    if (typeof value !== "string" || value.length > 2000) throw new Error("A mensagem deve ter até 2.000 caracteres.");
    return value.replace(/\r\n?/g, "\n").trim();
  }
  const aliases = (topic) => {
    const value = normalize(topic);
    if (value.includes("nfs-e")) return "nfse nfs-e nota fiscal servico nacional";
    if (value.includes("nota modelo (55)")) return "nfe nf-e modelo 55";
    if (value.includes("certificado")) return "certificado digital a1 pfx";
    if (value.includes("cancelamento")) return "cancelar cancelamento";
    if (value.includes("query")) return "query builder consulta relatorio subquery";
    if (value.includes("nfcom")) return "nfcom modelo 62 telecom comunicacao";
    if (value.includes("ordens de servico") || value.includes("modelo de o.s")) return "os o.s. ordem de servico ordens de servico";
    return "";
  };
  function normalizeOpaUrl(raw) {
    let url;
    try { url = new URL(String(raw).trim()); }
    catch { throw new Error("Informe a URL completa do Opa!, começando com http:// ou https://."); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Informe um endereço HTTP ou HTTPS válido, sem credenciais na URL.");
    }
    return url.origin;
  }
  function originPattern(origin) {
    const url = new URL(origin);
    return `${url.protocol}//${url.hostname}/*`;
  }
  function itemFromFile(filename, href, defaultTopic = "Fiscal") {
    let url;
    try { url = new URL(href); } catch { return null; }
    const match = url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)\/view$/);
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com" || url.port || url.username || url.password || !match) return null;
    const original = String(filename).trim();
    if (!original || /nomenclatura do conteudo/.test(normalize(original))) return null;
    if (/\.(pdf|docx?|xlsx?|csv|txt|json|xml|png|jpe?g|gif|svg|pptx?|zip|rar|7z)$/i.test(original)) return null;
    let cleaned = original.replace(/^[✔➡→]\uFE0F?\s*(?:\|\s*)?/, "").replace(/^Cópia de\s+/i, "");
    const date = cleaned.match(/^\|?\s*(\d{2})[/_-](\d{2})[/_-](\d{4})(?:\s*\|\s*|\s*-?\s*)/);
    if (date) cleaned = cleaned.slice(date[0].length);
    const format = cleaned.match(/\.(mp4|mkv|webm|mov|avi)$/i);
    if (format) cleaned = cleaned.slice(0, -format[0].length);
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    const bracketedSubject = cleaned.match(/^\[([^\]]+)\]\s*(.+)$/);
    const pipe = cleaned.indexOf("|");
    const divider = pipe >= 0 && !/campos\s*:/i.test(cleaned.slice(0, pipe)) ? pipe : -1;
    let topic = bracketedSubject ? bracketedSubject[1].trim() : divider >= 0 ? cleaned.slice(0, divider).trim() : defaultTopic;
    const title = bracketedSubject ? bracketedSubject[2].trim() : divider >= 0 ? cleaned.slice(divider + 1).trim() : cleaned;
    if (!bracketedSubject && divider < 0) {
      if (/dici/i.test(title)) topic = "DICI";
      else if (/tributa/i.test(title)) topic = "Tributação";
      else if (/informações complementares/i.test(title)) topic = "Informações complementares";
    }
    const displayTopic = normalize(topic) === "tipo documento" ? "Tipo de documento" : topic;
    const hasSubject = Boolean((bracketedSubject || divider >= 0) && displayTopic);
    const displayTitle = hasSubject ? `${displayTopic} | ${title}` : title;
    topic = ({ "query": "Query Builder", "query builder": "Query Builder",
      "canelamento fiscal": "Cancelamento Fiscal", "vinculo fiscal": "Vínculo Fiscal",
      "nfcom (62)": "NFCom (62)", "ordem de servico": "Ordens de serviço",
      "modelo de impressao": "Modelos de impressão", "modelo de os": "Modelos de O.S.",
      "tipo documento": "Tipo de documento",
      "sla": "SLA" })[normalize(topic)] || topic;
    if (!title) return null;
    return { id: match[1], originalFilename: original, title, topic, displayTitle, hasSubject,
      dateInFilename: date ? `${date[3]}-${date[2]}-${date[1]}` : null,
      format: format ? format[1].toLowerCase() : null, url: url.href,
      checkmarkInFilename: original.startsWith("✔"),
      searchText: normalize(`${original} ${title} ${topic} ${aliases(topic)}`) };
  }
  function validateCatalog(raw, expectedAreaId) {
    if (!raw || !Array.isArray(raw.items) || raw.items.length > maxItems) {
      throw new Error("O catálogo não contém uma lista válida de vídeos.");
    }
    const inferred = raw.areaId || areas.find((area) => area.folderId === raw.source?.folderId)?.id || "fiscal";
    const area = areaConfig(expectedAreaId || inferred);
    if (!raw.items.length && !area.personal) throw new Error("O catálogo não contém uma lista válida de vídeos.");
    if (expectedAreaId && (raw.source?.folderId !== area.folderId || (raw.areaId && raw.areaId !== area.id))) {
      throw new Error("O catálogo não corresponde à pasta da área selecionada.");
    }
    const ids = new Set();
    const items = raw.items.map((input) => {
      const item = itemFromFile(input.originalFilename, input.url, area.label);
      if (!item || item.id !== input.id || ids.has(item.id)) {
        throw new Error("O catálogo contém um registro inválido ou repetido.");
      }
      ids.add(item.id);
      if (input.folderId !== undefined || input.folderPath !== undefined) {
        if (typeof input.folderId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(input.folderId)
          || typeof input.folderPath !== "string" || input.folderPath.length > 2000) {
          throw new Error("O catálogo contém uma pasta inválida.");
        }
        item.folderId = input.folderId; item.folderPath = input.folderPath;
        item.searchText += ` ${normalize(input.folderPath)}`;
      }
      return item;
    });
    return { ...raw, schemaVersion: 1, areaId: area.id, items, itemCount: items.length };
  }
  function parsePublicFolderPage(html, areaId = "fiscal") {
    const area = areaConfig(areaId);
    if (typeof DOMParser === "undefined") throw new Error("Abra a extensão para atualizar os vídeos.");
    const document = new DOMParser().parseFromString(html, "text/html");
    const items = [];
    const folders = [];
    const seen = new Set();
    for (const anchor of document.querySelectorAll('a[href]')) {
      const folder = folderFromLink(anchor.textContent, anchor.getAttribute("href"));
      if (folder) { folders.push(folder); continue; }
      const item = itemFromFile(anchor.textContent, anchor.getAttribute("href"), area.label);
      if (item && !seen.has(item.id)) { seen.add(item.id); items.push(item); }
    }
    if (!items.length && !folders.length && !document.querySelector(".flip-contents")) {
      throw new Error("Não foi possível ler os vídeos. A pasta pode ter mudado de acesso ou de formato. O catálogo anterior foi mantido.");
    }
    return { items, folders };
  }
  function catalogFromTree(items, areaId, folders = [], ignoredFolders = []) {
    const area = areaConfig(areaId);
    return validateCatalog({ schemaVersion: 1, areaId: area.id, snapshotDate: new Date().toISOString().slice(0, 10),
      source: { name: area.sourceName, folderId: area.folderId, url: area.folderUrl,
        scope: "Pasta e subpastas; exclui nomes contendo fora de contexto, fora do contexto ou regravar." },
      items, itemCount: items.length,
      folders, ignoredFolders,
      metadataNotes: ["Títulos, assuntos e datas extraídos dos nomes dos arquivos. Vídeos não assistidos."] }, areaId);
  }
  function parsePublicFolder(html, areaId = "fiscal") {
    return catalogFromTree(parsePublicFolderPage(html, areaId).items, areaId);
  }
  function search(items, query = "", topic = "", favoritesOnly = false, favorites = []) {
    const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
    const starred = new Set(favorites);
    return items.filter((item) => (!topic || item.topic === topic)
      && (!favoritesOnly || starred.has(item.id))
      && tokens.every((token) => `${item.searchText} ${aliases(item.topic)}`.includes(token)))
      .sort((a, b) => {
        const score = (item) => tokens.reduce((n, token) => n + (normalize(item.title).includes(token) ? 2 : 0), 0);
        return score(b) - score(a) || a.title.localeCompare(b.title, "pt-BR");
      });
  }
  function messageFor(item, includeTitle, introduction = defaultIntroduction) {
    if (!includeTitle) return item.url;
    return [validateIntroduction(introduction), item.displayTitle || item.title, item.url].filter(Boolean).join("\n");
  }
  globalThis.SpeedVideosCore = { opaOrigin, opaPattern, defaultIntroduction, legacyFinanceFolderId, maxFolders, maxItems,
    maxPersonalFolders, personalFolderFromUrl, validatePersonalFolder, validatePersonalFolders,
    areas: Object.freeze(areas), areaConfig, folderId, folderUrl, folderFeed, normalize,
    isIgnoredFolder, folderFromLink, foldersInHtml, validateIntroduction, normalizeOpaUrl, originPattern,
    itemFromFile, validateCatalog, parsePublicFolderPage, catalogFromTree, parsePublicFolder, search, messageFor };
})();
