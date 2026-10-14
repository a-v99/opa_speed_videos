"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const source = (name) => fs.readFileSync(path.join(root, name), "utf8");
const manifest = JSON.parse(source("manifest.json"));
const pkg = JSON.parse(source("package.json"));
const lock = JSON.parse(source("package-lock.json"));
const jsFiles = ["core.js", "background.js", "view.js", "content.js", "popup.js", "options.js"];
for (const name of jsFiles) {
  const checked = spawnSync(process.execPath, ["--check", path.join(root, name)], { stdio: "inherit" });
  if (checked.error || checked.status !== 0) throw checked.error || new Error("Sintaxe inválida: " + name);
}
if (manifest.version !== pkg.version || manifest.version !== lock.version
  || manifest.version !== lock.packages[""].version) throw new Error("As versões do manifesto, package e lockfile devem ser iguais.");
for (const name of [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page]) {
  if (!fs.existsSync(path.join(root, name))) throw new Error("Arquivo ausente: " + name);
}
for (const name of ["popup.html", "options.html"]) {
  for (const match of source(name).matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) throw new Error("Recurso local ausente: " + match[1]);
  }
}
const options = source("options.html");
if (!options.includes("Versão " + manifest.version)) throw new Error("Atualize a versão no rodapé das opções.");
if (!options.includes('id="repository-link"') || !options.includes('href="https://github.com/a-v99/opa_speed_videos"')) {
  throw new Error("O link do repositório deve estar nas opções.");
}
const context = vm.createContext({ URL, console });
vm.runInContext(source("core.js"), context);
let videos = 0;
for (const area of context.SpeedVideosCore.areas) {
  const catalog = context.SpeedVideosCore.validateCatalog(JSON.parse(source(area.bundledFile)), area.id);
  videos += catalog.items.length;
}
console.log("Sintaxe, arquivos, versões e catálogos válidos: " + videos + " registros.");
