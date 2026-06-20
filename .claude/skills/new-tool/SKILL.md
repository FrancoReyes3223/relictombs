---
name: new-tool
description: "Scaffold completo de una nueva tool generica de Odoo para Tuqui. Crea el archivo de la tool, el test con MockTransport, y recuerda los pasos de registro. Usar con el nombre de la tool como argumento, por ejemplo /new-tool odoo_search_read."
argument-hint: "<nombre_tool> (ej: odoo_fields_get)"
---

Creá el scaffold completo para la tool genérica de Odoo llamada `$ARGUMENTS`.

## Pasos a ejecutar

1. **Leer primero** los archivos de referencia:
   - Un tool existente en `tuqui_core/tools/generic/` para tomar el patrón exacto
   - `tuqui_core/mcp/tool_registry.py` para entender cómo se registra
   - `tuqui_core/mcp/router.py` para ver cómo se agrega al schema

2. **Crear** `tuqui_core/tools/generic/$ARGUMENTS.py` siguiendo este patrón:
   ```python
   """Tool: $ARGUMENTS — one-line description."""

   from typing import Any
   from uuid import UUID

   from tuqui_core.integrations.odoo.adapter import OdooAdapter
   from tuqui_core.observability.logging import get_logger
   from tuqui_core.tools.base import Tool

   logger = get_logger()


   class <NombreEnPascalCase>Tool(Tool):
       name = "$ARGUMENTS"
       description = "One-line description visible to the LLM."
       input_schema = {
           "type": "object",
           "properties": {
               # define los parámetros de la tool
           },
           "required": [...],
       }

       async def execute(
           self,
           adapter: OdooAdapter,
           workspace_id: UUID,
           odoo_version: str,
           **kwargs: Any,
       ) -> <return_type>:
           """One-line description of what the tool does.

           Args:
               adapter: OdooAdapter instance for Odoo operations.
               workspace_id: Workspace UUID (used for cache scoping if needed).
               odoo_version: Odoo major version string.
               **kwargs: Tool-specific arguments.

           Returns:
               Description of return value and its type.
           """
           # extraer kwargs con tipos explícitos
           return await adapter.<método>(<args>)


   $ARGUMENTS = <NombreEnPascalCase>Tool()
   ```

3. **Crear** `tuqui_core/tests/test_tool_$ARGUMENTS.py` usando `MockTransport`:
   ```python
   import pytest
   from uuid import uuid4
   from tuqui_core.tools.generic.$ARGUMENTS import $ARGUMENTS
   from tuqui_core.integrations.odoo.transports.mock import MockTransport
   from tuqui_core.integrations.odoo.adapter import OdooAdapter

   @pytest.fixture
   def adapter():
       return OdooAdapter(transport=MockTransport())

   @pytest.mark.asyncio
   async def test_$ARGUMENTS_basic(adapter):
       result = await $ARGUMENTS.execute(adapter, uuid4(), "18", ...)
       assert result is not None
   ```

4. **Mostrar** los cambios pendientes manuales:
   - `mcp/tool_registry.py`: agregar import y registro de la tool
   - `mcp/router.py`: agregar schema de la tool al endpoint MCP

## Convenciones que NO se pueden violar
- Type hints: SOLO para parámetros, tipos de retorno, y variables donde sea necesario forzar el indexing del IDE
- Todos los comentarios de código y docstrings deben estar en inglés. Usar Google-style con secciones Args y Returns
- `structlog` si necesitás logging — nunca `print()`
- La tool recibe el `OdooAdapter` — nunca importar un transport directamente
- El test usa `MockTransport` — nunca llamar a un Odoo real
- Nunca agregar métodos write al adapter
