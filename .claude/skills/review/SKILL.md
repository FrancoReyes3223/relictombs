---
name: review
description: Revisa código de Tuqui contra las convenciones de CLAUDE.md y las reglas de seguridad del proyecto. Puede revisar un archivo específico, un directorio, o los cambios actuales del working tree. Usar con ruta como argumento, o sin argumento para revisar los cambios staged/unstaged.
argument-hint: "[ruta/al/archivo_o_directorio]"
---

Revisá el código de Tuqui en busca de violaciones a las convenciones y reglas de seguridad.

**Objetivo:** `$ARGUMENTS` (si está vacío, revisar los cambios del working tree con `git diff HEAD`)

## Pasos a ejecutar

1. **Leer** el código objetivo:
   - Si se especificó una ruta: leer ese archivo o los archivos del directorio
   - Si no hay argumento: ejecutar `git diff HEAD` para ver los cambios actuales

2. **Revisar contra cada categoría** a continuación

## Checklist de revisión

### Seguridad (severidad alta — bloquean merge)

- [ ] El `OdooAdapter` no tiene métodos write nuevos (`write`, `create`, `unlink`, `execute_kw` mutante)
- [ ] Tabla nueva con `workspace_id` → tiene `ENABLE ROW LEVEL SECURITY` y su policy
- [ ] No hay credenciales hardcodeadas (API keys, tokens, passwords, URLs de conexión)
- [ ] No se loggean datos sensibles (respuestas Odoo, API keys, tokens OAuth)
- [ ] Las tools no importan ni usan transports directamente (solo via `OdooAdapter`)

### Tipos y modelos

- [ ] Type hints: SOLO parámetros, tipos de retorno, y variables donde sea necesario (NO todas las variables)
- [ ] Todos los comentarios de código y docstrings están en inglés
- [ ] Los docstrings usan Google-style (descripción, secciones Args, Returns)
- [ ] Los modelos de datos usan Pydantic (no dicts crudos, no dataclasses sin Pydantic)

### Async / I/O

- [ ] Todo I/O (DB, Redis, Odoo, HTTP) es `async/await`
- [ ] No hay llamadas bloqueantes en contexto async (sin `time.sleep`, sin requests síncronos)

### Logging

- [ ] Solo `structlog` — sin `print()`, sin `logging.getLogger()`
- [ ] Los log entries de tools incluyen: `workspace_id`, `tool_name`, `duration_ms`, `status`

### Tests

- [ ] Tool nueva → tiene `test_tool_<nombre>.py` con `MockTransport`
- [ ] Tabla nueva con `workspace_id` → tiene test en `test_rls.py`

### Estructura
- [ ] Archivos nombrados en `snake_case.py`
- [ ] Clases en `PascalCase`, funciones en `snake_case`
- [ ] URLs públicas en `kebab-case`, internas en `snake_case`
- [ ] Config via `pydantic-settings`, no hardcodeada

## Formato de respuesta

Para cada problema encontrado:
```
[ALTA/MEDIA/BAJA] archivo.py:línea — descripción del problema
→ Cómo corregirlo
```

Al final: resumen con conteo por severidad y veredicto (`✓ Aprobado` / `⚠ Observaciones` / `✗ Bloqueado`).
