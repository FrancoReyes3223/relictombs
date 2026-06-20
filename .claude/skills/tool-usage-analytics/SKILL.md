# Skill: tool-usage-analytics

Consulta `tool_usage_log` / `tool_usage_log_admin` vía el MCP server de Supabase para analizar patrones de uso, errores y performance de tools.

## Cuándo usar

- Investigar errores recurrentes en una tool (RuntimeError, TimeoutError)
- Ver distribución de uso por tool, workspace o usuario
- Drill-down en una request específica via `mcp_request_id`
- Correlacionar todas las tool calls de una conversación de chat via `session_id`
- Identificar sesiones largas o con muchas calls

## Convenciones

- Siempre filtrar `created_at >= now() - interval 'N days'` para no escanear la tabla completa
- `tool_usage_log_admin` agrega `is_error` y `is_timeout` como booleanos derivados de `status`
- `source = 'chat'` → chat de Tuqui, `source = 'mcp'` → clientes MCP externos
- Para análisis de errores: excluir `status = 'ok'` con `WHERE status != 'ok'`
- No pegar JSON de `arguments` en salidas públicas — ya está redactado pero puede contener shapes de datos sensibles

## Queries de referencia

### 1. Errores recientes (últimas 24h)

```sql
SELECT
    created_at,
    tool_name,
    error_type,
    error_message,
    duration_ms,
    source,
    workspace_id,
    mcp_request_id
FROM tool_usage_log_admin
WHERE is_error = true
  AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 100;
```

### 2. Mix de uso por tool (últimos 7 días)

```sql
SELECT
    tool_name,
    source,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE is_error) AS errors,
    COUNT(*) FILTER (WHERE is_timeout) AS timeouts,
    ROUND(AVG(duration_ms)) AS avg_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms
FROM tool_usage_log_admin
WHERE created_at >= now() - interval '7 days'
  AND source IS NOT NULL
GROUP BY tool_name, source
ORDER BY total_calls DESC;
```

### 3. Drill-down por `mcp_request_id` (todas las calls de una misma request LLM)

```sql
-- Reemplazar el UUID con el mcp_request_id de interés
SELECT
    created_at,
    tool_name,
    status,
    duration_ms,
    arguments,
    error_message
FROM tool_usage_log_admin
WHERE mcp_request_id = '<uuid>'
ORDER BY created_at;
```

### 4. Sesiones largas de chat (por número de tool calls)

```sql
SELECT
    session_id,
    COUNT(*) AS tool_calls,
    MIN(created_at) AS started_at,
    MAX(created_at) AS last_call_at,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS duration_seconds,
    COUNT(*) FILTER (WHERE is_error) AS errors
FROM tool_usage_log_admin
WHERE source = 'chat'
  AND session_id IS NOT NULL
  AND created_at >= now() - interval '7 days'
GROUP BY session_id
ORDER BY tool_calls DESC
LIMIT 20;
```

### 5. Errores de una tool específica con shape de arguments (para reproducir bugs)

```sql
SELECT
    created_at,
    duration_ms,
    error_type,
    error_message,
    arguments,
    workspace_id,
    mcp_request_id
FROM tool_usage_log_admin
WHERE tool_name = 'odoo_models_list'
  AND is_error = true
  AND created_at >= now() - interval '30 days'
ORDER BY created_at DESC
LIMIT 50;
```

### 6. Distribución de status por workspace

```sql
SELECT
    workspace_id,
    status,
    COUNT(*) AS calls
FROM tool_usage_log_admin
WHERE created_at >= now() - interval '7 days'
  AND source IS NOT NULL
GROUP BY workspace_id, status
ORDER BY workspace_id, status;
```

## Flujo de investigación de bug

1. Identificar la ventana de tiempo y la tool con errores (query 1 o 5)
2. Tomar un `mcp_request_id` de una fila de error
3. Usar query 3 para ver todas las calls de esa request → entender contexto
4. Si es chat: usar `session_id` para ver la conversación completa
5. Revisar `arguments` para entender qué params mandó el LLM — los values PII aparecen redactados pero el shape (fields, domain, limit) está preservado

## Notas de privacidad

- `arguments` está redactado: valores literales de strings son truncados o reemplazados por shape
- Emails → `<email>`, números largos → `<number>`, strings > 200 chars → truncados
- Domain values → `<value>`, pero field name y operador se preservan
- **No copiar/pegar el JSON de `arguments` en tickets públicos o Slack sin revisión manual**
