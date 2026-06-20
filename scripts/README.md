# Sincronización con Google Drive

`sync-drive.mjs` genera `src/archivo.json` (el contenido de la web) recorriendo
la carpeta de Drive **"Recursos TurtleMe"** automáticamente. No hace falta editar
`App.jsx` a mano para sumar archivos: subís a Drive, corrés el sync, y deployás.

## Setup (una sola vez)

1. Entrá a https://console.cloud.google.com/apis/credentials
2. Creá una **API key**.
3. Habilitá la **Google Drive API** para ese proyecto.
4. Asegurate de que la carpeta raíz (y todo lo de adentro) esté compartida como
   **"Cualquiera con el enlace"** (la API key solo lee carpetas públicas).

## Uso

```bash
GOOGLE_API_KEY=tu_api_key npm run sync-drive
```

Esto reescribe `src/archivo.json`. Después:

```bash
npm run build   # o npm run dev para verlo local
```

> Tip: guardá la key en un archivo `.env` (ya está en `.gitignore`) y exportala,
> o pegala inline como arriba. **No la commitees.**

## Cómo mapea la estructura de Drive

| Drive                                   | Web                                        |
| --------------------------------------- | ------------------------------------------ |
| Carpeta de 1er nivel (`Soul Forged`…)   | Colección (con su color fijo)              |
| Subcarpeta de idioma (`Español`/`English`) | Idioma (`es` / `en`)                    |
| `Remastered` (en Tbate)                 | Inglés (`en`), pero como su nombre no es un idioma "puro", queda como prefijo del grupo (`Remastered · …`) para no mezclarse con el English normal |
| `Artes` (sin idioma)                    | Se publica en **ambos** idiomas            |
| Subcarpetas intermedias                 | `label` del grupo (`Traducción IA · VOL 1`)|
| Archivo                                 | Tarjeta (`titulo`, `formato`, `peso`, id)  |

La config de colecciones/colores está al inicio de `sync-drive.mjs`
(`COLLECTIONS` y `LANG_BY_NAME`) — si agregás una obra nueva, sumala ahí.

## Qué archivos entran

Solo se incluyen archivos **empaquetados** (EPUB, PDF, ZIP, imágenes…). Los
Google Docs / Sheets / Slides (capítulos sueltos editables) se **ignoran**, para
no llenar la web de cientos de tarjetas. Ese filtro es `isPackaged` en el script:
si en algún momento querés incluir los Docs, ajustalo ahí.
