---
name: git-commit
description: Crea un commit siguiendo las convenciones de Tuqui, luego propone actualizaciones de documentación (docs/architecture, contexto.md, CLAUDE.md, etc.) si los cambios lo justifican.
argument-hint: "[mensaje opcional o contexto adicional]"
allowed-tools:
  - Bash(bash .claude/skills/git-commit/check_migrations.sh)
---

Hacé un commit con los cambios actuales siguiendo las convenciones del proyecto, y luego evaluá si hay documentación que actualizar.

## Contexto

- Estado actual: !`git status`
- Diff completo: !`git diff HEAD`
- Últimos 15 commits (para inferir estilo): !`git log --oneline -15`
- Rama actual: !`git branch --show-current`
- Migraciones nuevas en esta rama (vs `origin/staging`): !`git fetch origin staging --quiet 2>/dev/null; git diff --name-only --diff-filter=A origin/staging...HEAD -- supabase/migrations/ 2>/dev/null || echo "(staging no disponible o repo sin supabase/migrations)"`
- Colisión vs `origin/staging` (BLOQUEANTE) y heads-up vs otras ramas remotas: !`bash .claude/skills/git-commit/check_migrations.sh`

> ⚠️ **Poka-yoke de migraciones — dos casos distintos:**
>
> 1. **Colisión vs `origin/staging`** = BLOQUEANTE. La PK de `schema_migrations` de Supabase se rompe si dos archivos comparten prefijo numérico. Renumerar **ahora**, antes del PR, al siguiente número libre tras el último de staging. Actualizar también el header `-- Migration: NNNN_*` dentro del SQL y cualquier referencia en `docs/architecture/database.md`.
>
> 2. **Solapamiento con otras ramas remotas vivas** = heads-up, **no renumerar todavía**. Mencionarlo al usuario al final como riesgo conocido: quien mergee primero a `staging` conserva el número, el otro va a tener que rebase + renumerar contra staging ya actualizado. Renumerar de forma especulativa solo desordena la conversación.

## Paso 1 — Crear el commit

### Reglas del mensaje

Inferí el estilo del proyecto desde el log. Las convenciones observadas en Tuqui son:

- **Prefijo convencional:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- **Línea de asunto:** imperativo, en inglés, ≤ 72 caracteres
- **Cuerpo opcional:** si el cambio es no obvio, agregar párrafo explicativo separado por línea en blanco
- **Sin Co-Authored-By de Claude ni de ningún LLM** — los commits son del equipo humano

### Qué stagear

- Stagear solo archivos relacionados al cambio (no `.env*`, no archivos de credenciales)
- Si hay cambios en múltiples features independientes, hacer commits separados

### Qué NO hacer

- No agregar `Co-Authored-By: Claude` ni ninguna atribución de LLM
- No inventar contexto que no esté en el diff
- No incluir archivos que probablemente tengan secretos

Ejecutá `git add <archivos>` y `git commit -m "..."` con el mensaje apropiado.

---

## Paso 2 — Evaluar documentación

Después del commit, revisá si los cambios impactan alguno de estos documentos y, de ser así, **proponé los cambios concretos** (no los hagas automáticamente — mostrá qué líneas cambiarían y esperá confirmación):

### `docs/architecture/`

| Archivo | Cuándo actualizarlo |
|---|---|
| `odoo.md` | Cambios en transport, adapter, schema_cache, user_sync |
| `tools.md` | Tool nueva o eliminada, cambio en base.py |
| `mcp.md` | Cambios en router, tool_registry, protocol |
| `auth.md` | Cambios en OAuth, tokens, dependencias de auth |
| `database.md` | Tabla nueva/modificada, migración |
| `users_workspaces.md` | Cambios en workspaces service, members, connect-odoo |
| `intelligence.md` | Cambios en briefing, discovery, synthesizer |
| `observability.md` | Cambios en logging, health checks, tool_logger |
| `config_crypto.md` | Cambios en config.py, crypto.py, platform_config |
| `features.md` | Feature flag nueva o modificada |
| `notifications.md` | Cambio en emails transaccionales |
| `panel.md` | Cambios significativos en la SPA |
| `entrypoints.md` | Nuevo endpoint o router |
| `db_layer.md` | Cambios en pool, RLS middleware |

### Otros documentos

| Archivo | Cuándo actualizarlo |
|---|---|
| `docs/contexto.md` | Decisión arquitectónica nueva, cambio de stack, nueva fase |
| `CLAUDE.md` | Convención nueva, regla de seguridad, cambio en estructura del proyecto |

### Formato de propuesta

Para cada documento que necesite cambios:

```
📄 docs/architecture/odoo.md — línea 82
  ANTES: # RPC /web/version → major version string
  DESPUÉS: # POST /web/webclient/version_info → major version string (Odoo 13+)
  MOTIVO: get_version() ahora usa el endpoint oficial estable
```

Si ningún documento necesita cambios, decí explícitamente `Documentación al día — sin cambios necesarios.`
