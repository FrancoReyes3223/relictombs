---
name: spec-check
description: Verifica si una feature, cambio o tarea está en scope para la fase actual de Tuqui y si es coherente con las decisiones arquitectónicas del proyecto. Útil antes de empezar a implementar algo nuevo.
argument-hint: "<descripcion de la feature o cambio>"
---

Analizá si lo siguiente entra en scope para la fase actual de Tuqui: `$ARGUMENTS`

## Pasos a ejecutar

1. **Leer** `docs/ESTADO.md` — estado actual, fases en desarrollo, backlog
2. **Leer** la sección "Fase actual" de `CLAUDE.md`
3. **Buscar** en `docs/contexto.md` si hay decisiones arquitectónicas relevantes para la consulta
4. **Consultar** la spec relevante en `docs/specs/` si aplica

## Responder con esta estructura

### ¿Entra en la fase actual?
- **Sí / No / Parcialmente**
- Justificación específica citando la sección de la spec o ESTADO.md que aplica

### Si no entra: ¿en qué fase correspondería?
- Backlog (tools de alto nivel, discovery dinámico)
- Fase 2: quick-win integrations
- Fase 3: investigador, synthesizer, memory
- Fase 4: frontend de chat

### ¿Hay decisiones arquitectónicas que afecten esto?
- Citar la sección de `docs/contexto.md` si aplica
- Si la decisión no está documentada, marcarlo como **gap de documentación**

### Criterios de aceptación (si entra en scope)
- Qué debe implementarse exactamente
- Qué tests son necesarios
- Qué archivos se tocan
- Alguna restricción de seguridad a tener en cuenta (RLS, Odoo read-only, credenciales)

### Veredicto final
`✓ Proceder` / `✗ No entra en 1.1` / `⚠ Aclarar antes de implementar`
