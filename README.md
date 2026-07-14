# Adeptos CRM - MCP Server

Este servidor implementa el protocolo [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) para conectar los Agentes de IA de Adeptos de manera segura y estandarizada con la API Backend (Golang).

Permite que el Agente de IA ejecute operaciones (Tools) como consultar calendarios, crear oportunidades o leer clientes potenciales en tiempo real.

## 🚀 Inicio Rápido (Local)

El proyecto incluye un entorno de Docker configurado para correr y comunicarse transparentemente con tu backend local.

1. **Asegúrate de que tu backend Go esté corriendo (usualmente en el puerto `4000`).**
2. Clona/abre este repositorio y levanta Docker:

```bash
# Levanta el contenedor en puerto 3005 en modo daemon
docker compose up --build -d

# Ver los logs en vivo
docker compose logs -f
```

Una vez levantado, puedes visitar:
- **Salud del sistema**: `http://localhost:3005/health`
- **Documentación / Swagger**: `http://localhost:3005/api-docs`

---

## 🏗 Arquitectura del Proyecto

Este MCP sigue una arquitectura limpia estructurada en capas, enfocada en la Responsabilidad Única (SRP):

- `/src/config`: Variables de entorno y configuración estática (Swagger, puerto).
- `/src/controllers`: Maneja la interacción HTTP con Express, lee los Headers, loguea eventos y coordina las llamadas.
- `/src/services`: Donde sucede la ejecución de la lógica del MCP y donde se conectan a `adeptos-api-client.ts`.
- `/src/routes`: Ruteo básico en Express (`/mcp`, `/health`, `/api-docs`).
- `/src/tools`: Exponen la metadata de las herramientas (Schemas Zod) al protocolo MCP.
- `/src/types`: 
  - `interfaces`: Estructuras puras (Responses) idénticas a los structs en Golang.
  - `schemas`: Validaciones extremas usando **Zod** para las entradas del Agente de IA.

---

## 🤖 Guía de Integración para el Agente de IA

Aquí están las instrucciones clave:

El servidor implementa **JSON-RPC sobre HTTP (SSE / POST)** en la ruta `/mcp`.

### Conexión del Agente
Tu Agente de IA debe utilizar un cliente MCP compatible (por ejemplo, `@modelcontextprotocol/sdk/client`). Al establecer el transporte (Transport), debes apuntar al endpoint HTTP y, **muy importante**, pasar los headers de autenticación.

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
// o HttpTransport según corresponda

// La URL donde corre el Docker de este MCP
const mcpServerUrl = "http://localhost:3005/mcp";

// Estos valores deben venir del contexto del chat de tu usuario actual
const businessId = "1";
const jwtToken = "token_del_usuario_logueado";

const transport = new SSEClientTransport(
  new URL(mcpServerUrl),
  {
    headers: {
      "x-business-id": businessId,
      "Authorization": `Bearer ${jwtToken}`
    }
  }
);

const client = new Client({ name: "mi-agente-ia", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

// Descubrir herramientas
const tools = await client.listTools();
console.log(tools);
```

### Herramientas Expuestas
Al listar las tools, el agente descubrirá automáticamente herramientas pre-validadas por Zod:

#### Contactos
- `get_contacts`
- `create_contact`
- `update_contact`
- `delete_contact`

#### Calendario y Citas
- `get_calendars`
- `get_appointments`
- `create_appointment`
- `update_appointment`
- `delete_appointment`

#### Oportunidades y Pipelines
- `get_pipelines`
- `get_opportunities`
- `create_opportunity`
- `update_opportunity`
- `move_opportunity`
- `delete_opportunity`

#### Productos
- `get_products`
- `check_product_availability`
- `get_product_collections`

#### Órdenes de compra
- `create_purchase_order`
- `get_purchase_orders`
- `get_purchase_order`
- `update_purchase_order_status`
- `get_purchase_orders_summary`

> **Nota de Seguridad y Errores**: Si el agente envía datos incorrectos o le falta un campo requerido en el payload, el MCP interceptará el error de validación de `Zod` y responderá un texto plano indicándole al agente exactamente en qué se equivocó, para que el LLM lo pueda corregir y re-intentar automáticamente.

---

## Entornos

| Comando | Entorno | Descripción |
|---|---|---|
| `npm run dev` | Local | Usa `tsx watch` para reiniciar en vivo. |
| `npm run build` | Producción | Compila el TypeScript a `/dist` |
| `npm start` | Producción | Levanta la versión compilada en `dist/index.js` |