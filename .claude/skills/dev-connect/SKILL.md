---
name: dev-connect
description: Conecta Claude Code al MCP server de un PR preview de Railway y valida el cliente JSONRPC de Odoo. Usar cuando se quiere testear end-to-end lo que se está implementando contra la instancia real del PR.
argument-hint: "[--pr N] [--slug workspace-slug]"
---

Conectá Claude Code al MCP server del PR preview y validá la conexión directa a Odoo JSONRPC.

## Prerequisitos (verificar antes de correr)

1. `.env.dev-connect` existe en la raíz del repo (copiar de `.env.dev-connect.example` y completar).
2. El PR preview en Railway está deployado (verificar en el dashboard de Railway).
3. `httpx` disponible en el virtualenv activo.

## Pasos a ejecutar

### 1. Resolver PR y slug

Los args `$ARGUMENTS` deben incluir `--pr N` y `--slug S`. Si falta alguno, pedirlos al usuario antes de continuar — no hay auto-detección via gh CLI.

### 2. Conectar al MCP server

```bash
python scripts/dev_connect.py $ARGUMENTS
```

El script:
- Verifica `/health` del preview
- Llama `tools/list` para validar token y slug
- Escribe `.mcp.json` resuelto en la raíz del repo con los servidores `tuqui-pr` y `supabase`

Si el script falla:
- **401**: `MCP_DEV_TOKEN` incorrecto — verificar en `.env` o env var
- **404**: slug incorrecto o workspace no existe en staging Supabase
- **Connect error**: preview no deployado todavía — esperar Railway o verificar la URL

### 3. Reconectar Claude Code

Después de que `dev_connect.py` escriba `.mcp.json`, ejecutar `/mcp` en esta sesión para que Claude Code cargue los servidores `tuqui-pr` y `supabase`.

Verificar que ambos servidores aparecen listados y reportar las tools disponibles de `tuqui-pr`.

### 4. Validar cliente Odoo JSONRPC

```bash
python scripts/odoo_repl.py --health
```

Si falla: revisar credenciales en `.env.dev-connect` (ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY).

### 5. Reportar estado

Imprimir un resumen al dev con:
- URL del MCP: `https://tuqui-core-pr-<N>.up.railway.app/mcp/<slug>`
- Slug del workspace
- URL de Odoo que usa ese workspace
- Cantidad de tools disponibles
- Estado del health check de Odoo

---

## Cómo usar los dos canales para testear end-to-end

Una vez conectado, el patrón de testing es:

**Canal 1 — MCP (como lo ve Claude.ai en producción):**
Invocar la tool directamente desde esta sesión:
```
Use tool: tuqui-pr / odoo_search_read
  model: res.partner
  domain: [["is_company", "=", true]]
  fields: ["name", "email"]
  limit: 5
```

**Canal 2 — JSONRPC directo (ground truth):**
```bash
python scripts/odoo_repl.py --search-read res.partner '[["is_company","=",True]]' name,email --limit 5
```

> **IMPORTANTE:** El dominio usa `ast.literal_eval` (sintaxis Python), no JSON. Usar `True`/`False` (mayúscula), no `true`/`false`. Con minúscula da `ValueError: malformed node`.

Comparar los resultados de ambos canales. Si difieren, el bug está en la tool (transformación, filtrado, o parámetros incorrectos). Si coinciden, la tool funciona correctamente.

**Para queries más complejas desde Bash:**
```bash
python scripts/odoo_repl.py --search-count sale.order '[["state","=","sale"]]'
python scripts/odoo_repl.py --search-read sale.order '[]' id,name,state --limit 3
```

**REPL interactivo (para exploración ad-hoc):**
```bash
python scripts/odoo_repl.py
# En el REPL: await client.search_read("res.partner", [], ["name"], limit=3)
```
