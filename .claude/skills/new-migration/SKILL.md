---
name: new-migration
description: "Genera una migracion SQL para Tuqui con el boilerplate correcto. Si la tabla tiene workspace_id, agrega RLS automaticamente. Usar con el nombre de la tabla como argumento, por ejemplo /new-migration oauth_tokens."
argument-hint: "<nombre_tabla> [descripcion opcional]"
---

Creá una nueva migración SQL para la tabla `$ARGUMENTS`.

## Pasos a ejecutar

1. **Determinar el número** de la próxima migración leyendo los archivos en `supabase/migrations/` y tomando el siguiente número secuencial.

2. **Preguntar** (si no fue especificado) si la tabla tendrá `workspace_id`. Si la respuesta es sí, el RLS es obligatorio.

3. **Crear** `supabase/migrations/NNNN_$ARGUMENTS.sql` con este formato:

   **Sin workspace_id:**
   ```sql
   -- Descripción: <qué hace esta migración>

   CREATE TABLE IF NOT EXISTS $ARGUMENTS (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       -- columnas aquí
       created_at timestamptz NOT NULL DEFAULT now()
   );
   ```

   **Con workspace_id (RLS obligatorio):**
   ```sql
   -- Descripción: <qué hace esta migración>

   CREATE TABLE IF NOT EXISTS $ARGUMENTS (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
       -- columnas aquí
       created_at timestamptz NOT NULL DEFAULT now()
   );

   ALTER TABLE $ARGUMENTS ENABLE ROW LEVEL SECURITY;

   CREATE POLICY $ARGUMENTS_workspace_isolation ON $ARGUMENTS
       USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
   ```

4. **Recordar** los pasos manuales pendientes:
   - Si tiene `workspace_id`: agregar test de aislamiento en `tuqui_core/tests/test_rls.py`
   - Crear modelo Pydantic correspondiente si se necesita

## Reglas inamovibles
- Todas las migraciones son **idempotentes** (`IF NOT EXISTS`, `IF EXISTS`, `OR REPLACE`)
- El rol `tuqui_app` NO es superuser — no requerir superuser en operaciones runtime
- Tabla con `workspace_id` sin RLS = violación de seguridad crítica
