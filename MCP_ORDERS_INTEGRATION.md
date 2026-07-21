# Integración MCP ↔ Órdenes de compra (Purchase Orders)

Documento para:
1. **Quien construyó órdenes / tienda / backend** — qué consume el MCP y cómo encaja.
2. **Quien configura el agente** — qué tools existen y qué falta hacer del lado del agente.

Fecha: 2026-07-14  
Repos: `mcp-adeptos-crm` + `api` (feature `purchaseorder`)

---

## Resumen en una frase

El agente ya **no inventa órdenes**: usa tools del MCP CRM, que hablan con la API de Adeptos (`purchase-orders` / `agent/purchase-order`), y dejan el intent registrado en el panel del negocio.

```
Cliente (WhatsApp / chat)
        │
        ▼
   Agente IA  ──tools/call──►  MCP CRM (:3005)
                                   │
                                   │ JWT + x-business-id
                                   ▼
                            API Adeptos (:4000)
                                   │
                                   ▼
                         purchase_orders (Postgres)
                                   │
                                   ▼
                    Panel owner → /owner/purchase-orders
                    (+ notificación WhatsApp al negocio, si está configurada)
```

---

## Parte A — Para quien hizo órdenes / tienda / backend

### Qué problema resolvimos

Había un endpoint público que el agente podía llamar directo:

```http
POST /api/v1/agent/purchase-order
```

Eso funcionaba, pero **no estaba en el MCP**. El agente no tenía tools tipadas (Zod) para crear/listar/actualizar órdenes, y podía “alucinar” o saltarse el flujo.

### Qué se hizo en backend

| Cambio | Dónde | Para qué |
|--------|--------|----------|
| Endpoint JWT de creación | `POST /api/v1/purchase-orders/` | El MCP crea órdenes autenticado (mismo body que el agent endpoint) |
| Rutas JWT existentes reutilizadas | `GET /`, `GET /summary`, `GET /:id`, `PUT /:id/status` | Listar, resumen, detalle, cambiar estado |
| Endpoint público sin cambios de contrato | `POST /api/v1/agent/purchase-order` | Sigue disponible para llamadas directas / fallback |

Archivos clave:
- [`api/api/features/purchaseorder/handlers.go`](../api/api/features/purchaseorder/handlers.go) — `HandleAgentRequest`, **`CreatePurchaseOrder`** (nuevo, con JWT)
- [`api/api/features/purchaseorder/routes.go`](../api/api/features/purchaseorder/routes.go) — `POST /`
- [`api/api/features/purchaseorder/service.go`](../api/api/features/purchaseorder/service.go) — `CreateFromAgent`, match producto, dedupe 24h, notify

### Contrato de creación (mismo body)

```json
{
  "agent_id": "demo-negocio-1",
  "customer_name": "Santiago Ospina",
  "customer_phone": "+573173062430",
  "product": "4",
  "variant": "Talla M",
  "quantity": 3,
  "note": "Quiere entrega para el viernes",
  "session_id": "landing-..."
}
```

| Campo | Requerido | Notas |
|-------|-----------|--------|
| `agent_id` | Sí | Path / `externalAgentId` del agente (resuelve el negocio) |
| `customer_phone` | Sí | Teléfono del cliente |
| `product` | Sí | **ID**, slug o nombre → se matchea contra `product_items` |
| `customer_name` | No | |
| `variant` | No | Nombre de variante (LIKE) |
| `quantity` | No | Entero positivo |
| `note` | No | |
| `session_id` | No | Útil para trazar la conversación |

**Respuesta típica**
```json
{
  "ok": true,
  "deduped": false,
  "purchaseOrder": { "id": 4, "status": "new", "productName": "...", ... }
}
```

- `deduped: true` → en ventana de 24h ya existía orden abierta (`new`/`contacted`) mismo teléfono+producto; se **actualizó**, no se duplicó.

### Qué consume / depende el MCP de la tienda

1. **Catálogo** (`product_items` / variantes): el campo `product` debe resolver a un ítem del negocio.
2. **Agente activo** con `agent_instances.path` (o `agents.config.creator.externalAgentId`) poblado. Sin eso → `no active agent instance for agent_id`.
3. **Auth JWT** en rutas protegidas (`Authorization: Bearer …`) y el usuario debe poder acceder al `businessId` del agente.
4. **Header** `x-business-id` en el MCP (negocio del workspace).

### Auth: qué usa cada ruta

| Ruta | Auth | Quién la usa |
|------|------|----------------|
| `POST /api/v1/agent/purchase-order` | Público | Agente directo / fallback MCP |
| `POST /api/v1/purchase-orders/` | JWT | MCP (preferido) |
| `GET /api/v1/purchase-orders/?businessId=` | JWT | MCP list |
| `GET /api/v1/purchase-orders/summary?businessId=` | JWT | MCP summary |
| `GET /api/v1/purchase-orders/:id` | JWT | MCP get |
| `PUT /api/v1/purchase-orders/:id/status` | JWT | MCP update status |

### Estados de la orden

`new` → `contacted` → `completed` | `cancelled`

El owner los cambia en el dashboard; el agente puede hacerlo vía tool `update_purchase_order_status` si se habilita.

### Notificación WhatsApp al negocio

Al crear (no dedupe), el backend intenta template `new_purchase_order`. Si faltan `NOTIFICATION_WA_*`, la orden **igual se crea** y `notifyStatus` queda `failed`. Eso no bloquea al MCP.

---

## Parte B — Para quien arma / configura el agente

### Qué se hizo en el MCP (`mcp-adeptos-crm`)

Se añadió el dominio **Purchase Orders** al mismo patrón que contacts / calendar / opportunities / products:

```
OrderTools → OrderController → OrderService → AdeptosApiClient → API Go
```

Archivos nuevos / tocados:
- `src/tools/order-tools.ts`
- `src/controllers/order.controller.ts`
- `src/services/order.service.ts`
- `src/types/schemas/order.ts`
- `src/types/interfaces/order.ts`
- `src/clients/adeptos-api-client.ts` (métodos de órdenes)
- `src/services/mcp.service.ts` (registro de `OrderTools`)
- `AGENT_PAYLOADS.md` (payloads documentados)

### Tools que el agente debe usar

| Tool | Cuándo usarla |
|------|----------------|
| `create_purchase_order` | El cliente **confirma** que quiere comprar / reservar |
| `get_products` / `check_product_availability` | Antes de ofrecer: ver catálogo y stock/precio reales |
| `get_purchase_orders` | Consultar órdenes del negocio / del cliente (search por teléfono) |
| `get_purchase_order` | Detalle por `order_id` |
| `update_purchase_order_status` | Solo si el flujo del negocio lo permite (ej. marcar contacted) |
| `get_purchase_orders_summary` | Conteos por estado |

Detalle de parámetros: ver [`AGENT_PAYLOADS.md`](./AGENT_PAYLOADS.md) sección **Órdenes de compra**.

### Flujo recomendado en el prompt del agente

1. Cliente pregunta por un producto → `get_products` o `check_product_availability`.
2. Cliente elige variante / cantidad → confirmar datos (nombre, teléfono, producto, cantidad, nota).
3. Cliente confirma → **una sola** llamada a `create_purchase_order`.
4. Responder con: producto resuelto, cantidad, y que el negocio fue notificado / recibirá seguimiento.
5. Si el cliente vuelve a pedir lo mismo en la misma conversación → puede devolver `deduped: true` (normal).

### Parámetros críticos que el agente debe enviar

```json
{
  "agent_id": "<path o externalAgentId del agente>",
  "customer_phone": "<del contacto / WhatsApp>",
  "customer_name": "<si se conoce>",
  "product": "<id o nombre exacto preferible>",
  "variant": "<si aplica>",
  "quantity": 1,
  "note": "<pedido especial>",
  "session_id": "<id de sesión conversacional>"
}
```

**Importante**
- `agent_id` **no** es el `business_id`. Es el identificador externo del agente (en local de pruebas usamos `demo-negocio-1`).
- Preferir `product` = **ID numérico** si ya lo obtuvo de `get_products`, para evitar ambigüedad de nombres.
- No inventar IDs de órdenes ni productos: si no hay tool success, **no** digas que la orden existe.

### Headers que debe mandar el runtime al MCP

```
POST http://<host-mcp>:3005/mcp
Authorization: Bearer <JWT del owner / servicio>
x-business-id: <id del negocio>
Content-Type: application/json
Accept: application/json, text/event-stream
```

El `Accept` con `text/event-stream` es obligatorio para el transporte Streamable HTTP del MCP.

### Ejemplo real de `tools/call` (crear orden)

```bash
curl -sS -X POST http://127.0.0.1:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $JWT" \
  -H "x-business-id: 1" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"create_purchase_order",
      "arguments":{
        "agent_id":"demo-negocio-1",
        "customer_name":"YO SEBAS",
        "customer_phone":"+573150001122",
        "product":"2",
        "quantity":2,
        "note":"Pedido de prueba MCP",
        "session_id":"console-mcp-2026-07-14"
      }
    }
  }'
```

Respuesta esperada (SSE `event: message`): JSON con `success: true` y `order.id`.

### Checklist — lo que falta hacer del lado del agente

- [ ] Conectar el runtime del agente a este MCP (`:3005` / URL de despliegue).
- [ ] Pasar siempre `Authorization` + `x-business-id`.
- [ ] Inyectar en contexto el `agent_id` real del agente (path / externalAgentId).
- [ ] Actualizar system prompt: “para comprar/reservar usa `create_purchase_order`; nunca inventes confirmaciones”.
- [ ] Preferir tool `get_products` antes de crear.
- [ ] Mapear teléfono de WhatsApp → `customer_phone`.
- [ ] Guardar `session_id` de la conversación en cada create.
- [ ] Verificar en entorno que `agent_instances.path` (o creator.externalAgentId) esté configurado.
- [ ] Probar E2E: crear → ver orden en `/owner/purchase-orders`.

### Errores comunes

| Error | Causa | Qué hacer |
|-------|--------|-----------|
| `no active agent instance for agent_id` | Path/externalAgentId vacío o mal | Configurar path del agente en backend |
| `Validation Error` (Zod) | Falta `agent_id` / `product` / `customer_phone` | Corregir argumentos de la tool |
| `Adeptos API Error (401)` | JWT inválido / ausente | Revisar header Authorization |
| `Adeptos API Error (403)` | Usuario sin acceso al negocio | JWT de un user con acceso a ese business |
| `deduped: true` | Misma compra en 24h | Esperado; orden existente refrescada |
| `notifyStatus: failed` | WA central no configurado | Orden OK; configurar notificaciones aparte |

---

## Parte C — Operación local (Docker)

| Servicio | Contenedor | Puerto |
|----------|------------|--------|
| MCP CRM | `mcp-adeptos-crm` | `3005` |
| API | `adeptosApi` | `4000` |

Variables relevantes (`.env` del MCP):

```env
ADEPTOS_API_BASE_URL=http://adeptosApi:4000   # desde Docker (misma red api_adeptos-network)
# ADEPTOS_API_BASE_URL=http://127.0.0.1:4000  # si corres MCP fuera de Docker
```

Health:
```bash
curl -sS http://127.0.0.1:3005/health
```

---

## Resumen para ambos equipos

| Equipo | Tu responsabilidad |
|--------|--------------------|
| **Órdenes / backend / tienda** | Mantener `purchase-orders`, match de productos, notificaciones, panel. El MCP ya consume tus endpoints JWT + agent. |
| **Agente** | Wired al MCP, tool `create_purchase_order` en el flujo de venta, prompts anti-alucinación, `agent_id` + teléfono + product id reales. |

Si el agente usa las tools bien, **deja de alucinar órdenes**: la fuente de verdad es `purchase_orders` en Adeptos.
