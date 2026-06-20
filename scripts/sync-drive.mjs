/*
  ──────────────────────────────────────────────────────────────
  sync-drive.mjs — genera src/archivo.json desde una carpeta de Drive
  ──────────────────────────────────────────────────────────────
  Recorre recursivamente la carpeta raíz de "Recursos TurtleMe" y
  aplana su estructura (de profundidad variable) al modelo que usa
  la web:  Colección → Grupo → Tarjeta.

  Uso:
    GOOGLE_API_KEY=xxxx npm run sync-drive

  Requisitos:
    - La carpeta (y subcarpetas) compartidas como "cualquiera con el enlace".
    - Una API key de Google con la "Google Drive API" habilitada.
      https://console.cloud.google.com/apis/credentials

  Reglas de mapeo (ver README de scripts):
    - Carpeta de 1er nivel  → Colección (con color fijo).
    - Nombre de subcarpeta  → Idioma (Español/Spanish=es, English/Remastered=en).
    - "Artes" no tiene idioma → se publica en ES y EN.
    - Camino intermedio      → label del Grupo (ej. "Traducción por IA · VOL 1").
    - Archivo hoja           → Tarjeta (titulo, formato, peso, driveId).
  ──────────────────────────────────────────────────────────────
*/

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT_ID = "1IFGbVw6iyLcbiTUliddszHYmjQ7ZMYES"; // "Recursos TurtleMe"
const API_KEY = process.env.GOOGLE_API_KEY;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "archivo.json");

const FOLDER_MIME = "application/vnd.google-apps.folder";

// Colecciones de 1er nivel: nombre en Drive → config de la web.
// mode "byLanguage": las subcarpetas inmediatas son idiomas.
// mode "dual": no hay idioma, se publica en ambos.
const COLLECTIONS = [
  { match: "soul forged", id: "soulforged", label: { es: "Soul Forged", en: "Soul Forged" }, color: "var(--soul)",   mode: "byLanguage" },
  { match: "tbate",       id: "tbate",      label: { es: "TBATE",       en: "TBATE" },       color: "var(--arcane)", mode: "byLanguage" },
  { match: "artes",       id: "artes",      label: { es: "Artes",       en: "Art" },         color: "var(--ember)",  mode: "dual" },
];

// Nombre de carpeta de idioma → código.
const LANG_BY_NAME = {
  "español": "es", "espanol": "es", "spanish": "es", "castellano": "es",
  "english": "en", "ingles": "en", "inglés": "en", "remastered": "en",
};

// Nombres "idioma puro": no se agregan al label del grupo (ya filtra el switch).
// Los que NO están acá (ej. "Remastered") sí se incluyen, para distinguir ediciones.
const PLAIN_LANG = new Set(["español", "espanol", "spanish", "castellano", "english", "ingles", "inglés"]);

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

async function listChildren(folderId) {
  const out = [];
  let pageToken;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      key: API_KEY,
      fields: "nextPageToken, files(id, name, mimeType, size, fileExtension)",
      pageSize: "1000",
      orderBy: "name",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    out.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

const isFolder = (f) => f.mimeType === FOLDER_MIME;

// Solo archivos "empaquetados" (EPUB/PDF/ZIP/imágenes…). Se descartan los
// Google Docs/Sheets/Slides — capítulos sueltos que no son descargas reales.
const isPackaged = (f) => !isFolder(f) && !(f.mimeType ?? "").includes("vnd.google-apps");

function humanSize(bytes) {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function formatOf(file) {
  if (file.fileExtension) return file.fileExtension.toUpperCase();
  const m = file.mimeType ?? "";
  if (m.includes("document")) return "DOC";
  if (m.includes("spreadsheet")) return "SHEET";
  if (m.includes("presentation")) return "SLIDES";
  if (m.includes("pdf")) return "PDF";
  if (m.startsWith("image/")) return m.split("/")[1].toUpperCase();
  return "FILE";
}

function cleanTitle(name) {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

function toItem(file) {
  return {
    titulo: cleanTitle(file.name),
    sub: "",
    formato: formatOf(file),
    peso: humanSize(file.size),
    driveId: file.id,
  };
}

// Recorre desde `folderId` juntando archivos en grupos.
// El label del grupo es el camino de subcarpetas recorrido (`path`).
async function collectGroups(folderId, path, fallbackLabel) {
  const children = await listChildren(folderId);
  const files = children.filter(isPackaged);
  const folders = children.filter(isFolder);
  const groups = [];

  if (files.length) {
    groups.push({
      id: norm((path.join("-") || fallbackLabel)).replace(/[^a-z0-9]+/g, "-"),
      label: path.join(" · ") || fallbackLabel,
      items: files.map(toItem),
    });
  }
  for (const f of folders) {
    groups.push(...(await collectGroups(f.id, [...path, f.name], fallbackLabel)));
  }
  return groups;
}

async function main() {
  if (!API_KEY) {
    console.error("Falta GOOGLE_API_KEY. Uso: GOOGLE_API_KEY=xxxx npm run sync-drive");
    process.exit(1);
  }

  const archivo = { es: [], en: [] };
  const topFolders = (await listChildren(ROOT_ID)).filter(isFolder);

  for (const top of topFolders) {
    const cfg = COLLECTIONS.find((c) => norm(top.name).includes(c.match));
    if (!cfg) {
      console.warn(`(ignorada) carpeta sin mapeo: "${top.name}"`);
      continue;
    }

    if (cfg.mode === "dual") {
      const groups = await collectGroups(top.id, [], cfg.label.es);
      if (!groups.length) continue;
      for (const lang of ["es", "en"]) {
        archivo[lang].push({ id: cfg.id, label: cfg.label[lang], color: cfg.color, grupos: groups });
      }
      console.log(`✓ ${cfg.label.es}: ${groups.length} grupo(s) → es + en`);
      continue;
    }

    // mode "byLanguage": cada subcarpeta inmediata es un idioma
    const langFolders = (await listChildren(top.id)).filter(isFolder);
    const byLang = { es: [], en: [] };
    for (const lf of langFolders) {
      const lang = LANG_BY_NAME[norm(lf.name)];
      if (!lang) { console.warn(`  (idioma desconocido) "${top.name}/${lf.name}"`); continue; }
      // Si la carpeta es una edición especial (no idioma puro, ej. "Remastered"),
      // la usamos como primer segmento del grupo para distinguirla de English normal.
      const startPath = PLAIN_LANG.has(norm(lf.name)) ? [] : [lf.name];
      const groups = await collectGroups(lf.id, startPath, lf.name);
      byLang[lang].push(...groups);
    }
    for (const lang of ["es", "en"]) {
      if (byLang[lang].length)
        archivo[lang].push({ id: cfg.id, label: cfg.label[lang], color: cfg.color, grupos: byLang[lang] });
    }
    console.log(`✓ ${cfg.label.es}: ${byLang.es.length} grupo(s) es, ${byLang.en.length} grupo(s) en`);
  }

  await writeFile(OUT, JSON.stringify(archivo, null, 2) + "\n");
  const total = [...archivo.es, ...archivo.en].reduce((n, c) => n + c.grupos.reduce((m, g) => m + g.items.length, 0), 0);
  console.log(`\n→ ${OUT}\n  ${total} archivo(s) en total.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
