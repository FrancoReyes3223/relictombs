---
name: i18n-web
description: Refactoriza componentes React de Tuqui Web para usar react-i18next con inglés como idioma base. Reemplaza textos hardcodeados por llamadas a t() con claves y valores en inglés, luego genera los archivos JSON de traducción (en/ y es/). Usar cuando el usuario quiere traducir un componente, una página, o un conjunto de archivos .tsx — o cuando dice "agrega i18n", "traduce", "internacionaliza", "reemplazá los textos", o pide generar/actualizar los archivos de traducción JSON.
argument-hint: "<ruta o nombre de archivo/directorio> (ej: src/pages/LoginPage.tsx o src/pages/)"
---

Refactorizá los textos del archivo o directorio `$ARGUMENTS` para usar react-i18next, con **inglés como idioma base**, y al terminar generá los archivos JSON de traducción.

## Contexto del proyecto

- **Motor ya configurado**: `web/src/i18n.ts` existe y `web/src/main.tsx` ya importa `./i18n`. No toques nada de eso.
- **Stack**: React 19, TypeScript 5.7, Vite 6.
- **Idioma base**: **inglés**. Las claves y los valores por defecto van en inglés. El español va en el archivo `es/translation.json`.
- **Archivos de traducción**: `web/public/locales/en/translation.json` (base) y `web/public/locales/es/translation.json` (español).

## Fase 1: Refactorización de componentes

### Identificar archivos

Si el argumento es un directorio, primero listá los `.tsx` que:
1. Contienen texto visible en el JSX (labels, botones, títulos, placeholders, mensajes de error)
2. **No** importan `useTranslation` todavía

Mostrá la lista al usuario antes de proceder.

Si el argumento es un archivo específico, procesalo directamente.

### Por cada archivo, aplicá estos pasos:

**Importación** — junto al resto de imports:
```ts
import { useTranslation } from 'react-i18next';
```

**Inicialización** — dentro del cuerpo del componente, antes del `return`:
```ts
const { t } = useTranslation();
```

Si hay múltiples componentes funcionales con texto en el mismo archivo, agregá el hook en cada uno.

**Refactorización** — reemplazá todos los textos visibles:

```tsx
// Texto en JSX
<Button>{t('save_changes', 'Save Changes')}</Button>

// Atributos (placeholder, title, alt, aria-label, etc.)
<input placeholder={t('placeholder_search_workspace', 'Search workspace')} />
<img alt={t('alt_company_logo', 'Company logo')} />

// Variables/props que van al render
const label = t('full_name_label', 'Full name');
```

### Reglas para las claves

- Formato: `snake_case` en **inglés**, sin acentos, sin caracteres especiales
- Descriptivas y semánticas: `save_changes` en lugar de `button_submit_form`
- Para atributos: prefijá con el tipo — `placeholder_`, `alt_`, `title_`, `aria_`
- Evitá genéricas como `text_1` o `message`
- Los valores por defecto también van en **inglés**: `t('invalid_credentials', 'Invalid credentials')`

### Lo que NO se toca

- Lógica de negocio: hooks, funciones, variables de estado, efectos
- Strings técnicos: IDs, clases CSS, URLs, rutas, slugs, query keys, nombres de campos
- Valores de `type`, `name`, `value` en inputs cuando son identificadores técnicos
- Comentarios, imports y exports
- Strings que ya son técnicos/internos en inglés

### Caso especial: strings en constantes de módulo

Si hay strings traducibles dentro de arrays o objetos definidos a nivel de módulo (fuera del componente), el hook no puede usarse ahí directamente. Patrón correcto:

```tsx
// Constante de módulo — dejala con los strings originales
const NAV_ITEMS = [
  { id: "settings", label: "Settings" },
  { id: "members", label: "Members" },
];

// Dentro del componente: construir un map de traducciones
const { t } = useTranslation();
const navLabels: Record<string, string> = {
  settings: t('nav_settings', 'Settings'),
  members: t('nav_members', 'Members'),
};

// Usarlo al renderizar
<span>{navLabels[item.id] ?? item.label}</span>
```

---

## Fase 2: Generar archivos de traducción

Una vez terminada la refactorización de todos los archivos del scope, generá los dos archivos JSON.

### Paso 1 — Recopilar todas las claves

Escaneá todos los archivos `.tsx` modificados (y los que ya usaban `useTranslation` previamente en el proyecto) para extraer cada llamada `t('clave', 'valor_en_ingles')`. Construí un mapa completo `clave → valor en inglés`.

Para escanear el proyecto completo:
```bash
grep -rh "t('" web/src --include="*.tsx" | grep -oP "t\('[^']+',\s*'[^']+'\)" | sort -u
```

### Paso 2 — Crear/actualizar `en/translation.json`

Escribí (o actualizá si ya existe) `web/public/locales/en/translation.json` con todas las claves en inglés:

```json
{
  "save_changes": "Save Changes",
  "cancel": "Cancel",
  "placeholder_search_workspace": "Search workspace",
  "nav_settings": "Settings",
  "nav_members": "Members"
}
```

Las claves deben estar ordenadas alfabéticamente.

### Paso 3 — Crear/actualizar `es/translation.json`

Traducí todos los valores al español y escribí `web/public/locales/es/translation.json`:

```json
{
  "save_changes": "Guardar cambios",
  "cancel": "Cancelar",
  "placeholder_search_workspace": "Buscar workspace",
  "nav_settings": "Configuración",
  "nav_members": "Miembros"
}
```

- Usá español natural y fluido (no traducción literal)
- Si un término técnico no tiene traducción natural (ej: "workspace", "MCP"), dejalo en inglés
- Mantené las claves ordenadas alfabéticamente

### Paso 4 — Crear los directorios si no existen

```bash
mkdir -p web/public/locales/en web/public/locales/es
```

---

## Verificación final

Antes de reportar como completo:

1. Sintaxis TypeScript válida: llaves `{}` balanceadas, JSX bien formado, no hay strings parciales
2. Hook `useTranslation` declarado en todos los componentes que llaman a `t()`
3. Sin imports duplicados
4. Ambos archivos JSON válidos y con las mismas claves
5. Las claves del JSON coinciden con las usadas en los `.tsx`

## Reporte final

Al terminar, mostrá:
- Archivos `.tsx` procesados
- Cantidad de claves nuevas generadas
- Ruta de los archivos JSON creados/actualizados
- Casos ambiguos que requieren revisión manual (interpolaciones complejas, strings dinámicos)
