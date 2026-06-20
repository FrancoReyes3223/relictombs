# El Soulscape — Archivo TurtleMe

Hub de descargas estático para el universo de TurtleMe (TBATE y Soul Forged).
Hecho con React + Vite. Sin backend: se buildea a HTML/CSS/JS y se sube a cualquier
hosting estático gratis (Cloudflare Pages, Netlify, etc.).

## Correrlo en tu compu

Necesitás Node.js (versión 18 o más nueva).

```bash
npm install        # instala las dependencias (una sola vez)
npm run dev        # levanta el server de desarrollo en http://localhost:5173
```

Cada vez que guardás un archivo, se recarga solo.

## Agregar / editar archivos del catálogo

Todo el contenido vive en la constante `ARCHIVO`, arriba de todo en `src/App.jsx`.
La estructura tiene tres niveles:

```
Colección  (Soul Forged, TBATE, Artes…)
  └─ Grupo  (Volumen 1, Volumen 2…)
       └─ Archivo  (EPUB / PDF / ZIP… con su driveId)
```

- Agregar un archivo  → sumás un objeto al array `items` de un grupo.
- Agregar un volumen  → sumás un objeto a `grupos`.
- Agregar una saga    → sumás una colección al array `ARCHIVO`.

### El driveId

El botón de descarga arma solo el link de descarga directa. Solo necesitás el ID
del archivo en Drive. La URL del archivo se ve así:

```
https://drive.google.com/file/d/ESTE_PEDAZO_ES_EL_ID/view
```

Copiás el pedazo del medio y lo pegás en `driveId`. Mientras una entrada tenga un
`driveId` que empiece con "PEGA_ID", el botón se muestra deshabilitado para que no
se te escape ninguno sin cargar.

> Importante: el archivo en Drive tiene que estar compartido como
> "Cualquier persona con el enlace puede ver", si no la descarga falla.

## Buildear y subir a Cloudflare Pages

```bash
npm run build      # genera la carpeta dist/ lista para producción
npm run preview    # (opcional) probás el build localmente
```

Para deploy en Cloudflare Pages conectando tu repo de GitHub:

- Build command:        `npm run build`
- Build output dir:     `dist`
- Framework preset:     Vite (o "None")

Cada push a la rama principal redespliega solo.

## Cosas a tener en cuenta

- **Throttle de Drive**: si un archivo recibe mucho tráfico, Google lo bloquea
  temporalmente. Si el sitio crece, conviene mover los archivos a Cloudflare R2
  o GitHub Releases (sin ese límite).
- **Archivos > ~100 MB**: Drive mete una pantalla intermedia de "no se pudo
  escanear por virus" que rompe la descarga directa.
- **Copyright**: subí tu propia traducción, fan art con crédito, o el web serial
  gratuito del autor. Los EPUB oficiales de Aethon Books son material con
  copyright (riesgo de DMCA y de que te suspendan la cuenta de Drive).

## Personalizar el diseño

Los colores, tipografías y el resto del estilo están en la constante `CSS` al final
de `src/App.jsx`. Las variables (`--soul`, `--ember`, `--arcane`, etc.) controlan la
paleta; cambiarlas ahí cambia todo el sitio.
