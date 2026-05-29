export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Adeptos CRM - MCP Server",
    version: "1.0.0",
    description: "Documentación para la integración del Agente de IA mediante el Model Context Protocol (MCP)."
  },
  servers: [
    {
      url: "http://localhost:3005",
      description: "Servidor Local"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      },
      businessIdHeader: {
        type: "apiKey",
        in: "header",
        name: "x-business-id",
        description: "ID del Negocio en Adeptos CRM"
      }
    }
  },
  security: [
    {
      bearerAuth: [],
      businessIdHeader: []
    }
  ],
  paths: {
    "/health": {
      get: {
        summary: "Verifica el estado del servidor MCP.",
        tags: ["System"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    server: { type: "string" },
                    timestamp: { type: "string", format: "date-time" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/mcp": {
      post: {
        summary: "Endpoint Principal MCP",
        description: "Este es el único endpoint que el Agente de IA necesita para conectarse usando el @modelcontextprotocol/sdk. Utiliza JSON-RPC over HTTP/SSE.",
        tags: ["MCP Core"],
        parameters: [
          {
            name: "x-business-id",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "El ID del negocio al cual pertenece el usuario con el que está hablando el agente."
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  jsonrpc: { type: "string", example: "2.0" },
                  id: { type: "number", example: 1 },
                  method: { type: "string", example: "tools/list" },
                  params: { type: "object" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Respuesta JSON-RPC estándar del MCP Server."
          }
        }
      }
    }
  },
  tags: [
    {
      name: "Available Tools (Tools expuestos vía MCP)",
      description: "El agente descubrirá las siguientes 15 herramientas cuando se conecte al /mcp.\n\n**Contacts**: get_contacts, create_contact, update_contact, delete_contact.\n\n**Calendar**: get_calendars, get_appointments, create_appointment, update_appointment, delete_appointment.\n\n**Opportunities**: get_pipelines, get_opportunities, create_opportunity, update_opportunity, move_opportunity, delete_opportunity."
    }
  ]
};
