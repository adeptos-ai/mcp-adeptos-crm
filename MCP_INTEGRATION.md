# MCP GHL — Integración con LangChain

## Qué es

Servidor MCP que expone 6 tools para gestionar citas de GoHighLevel (consultar disponibilidad, crear, listar, reagendar y cancelar citas).

Corre como contenedor Docker en la red `fr-hotel-network`.

## URL del servidor

```
http://mcp-ghl:3000/mcp
```

El contenedor se llama `mcp-ghl` y está en la red `fr-hotel-network`. Cualquier servicio en esa misma red puede alcanzarlo por nombre.

## Configuración en LangChain

Usar `langchain-mcp-adapters` para convertir los tools MCP a tools de LangChain:

```bash
pip install langchain-mcp-adapters
```

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

async with MultiServerMCPClient(
    {
        "ghl": {
            "url": "http://mcp-ghl:3000/mcp",
            "transport": "streamable_http",
            "headers": {
                "X-Business-Id": business_id,   # ID del negocio (locationId)
                "X-Ghl-Api-Key": ghl_api_key,   # API key de ese negocio
            },
        }
    }
) as client:
    tools = client.get_tools()
    # tools contiene: check_integration_status, get_free_slots,
    # create_appointment, list_appointments, cancel_appointment,
    # reschedule_appointment
```

Pasar `tools` al agente como cualquier otro tool de LangChain.

Cada sesión del agente debe crear su propio `MultiServerMCPClient` con el `business_id` y el `ghl_api_key` correspondientes. Ambos headers (`X-Business-Id` y `X-Ghl-Api-Key`) se envían automáticamente en cada request al servidor MCP. El servidor no tiene credenciales globales: la API key viaja por header, por lo que un mismo contenedor atiende múltiples cuentas GHL sin mezclar datos.

## Tools disponibles

| Tool | Descripción | Params principales |
|---|---|---|
| `check_integration_status` | Verifica si GHL está configurado para el negocio | ninguno |
| `get_free_slots` | Slots disponibles en un rango de fechas | `startDate`, `endDate`, `timezone?` |
| `create_appointment` | Crea una cita nueva | `startTime`, `endTime`, `email`/`phone`, `firstName?`, `lastName?`, `title?`, `notes?`, `timezone?` |
| `list_appointments` | Lista citas en un rango | `startDate`, `endDate` |
| `cancel_appointment` | Cancela una cita | `eventId` |
| `reschedule_appointment` | Reagenda una cita | `eventId`, `startTime`, `endTime`, `timezone?` |

## Notas

- Las fechas son `YYYY-MM-DD`, los horarios son ISO 8601 con zona horaria.
- `endTime` siempre es `startTime + 30 minutos`.
- Siempre llamar `check_integration_status` primero para verificar que la integración está activa.
- Siempre llamar `get_free_slots` antes de crear o reagendar para usar un slot válido.
- Para crear cita se requiere al menos `email` o `phone`.
- El `businessId` se pasa como header `X-Business-Id` al conectarse al MCP, no como parámetro en los tools.
- La API key de GHL se pasa como header `X-Ghl-Api-Key` en cada request; si falta, el servidor responde `400 Missing X-Ghl-Api-Key header`.
