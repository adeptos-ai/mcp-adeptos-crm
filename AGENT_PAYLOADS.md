# Documentación de Payloads para el Agente IA

Esta es una guía de referencia rápida sobre qué parámetros exactos espera recibir cada *Tool* (Herramienta) expuesta por el servidor MCP de Adeptos CRM. 

> **Nota:** Todos los tipos se validan estrictamente mediante Zod en el servidor. Si el Agente IA envía un parámetro incorrecto, el servidor le responderá con un error claro indicando el fallo.

---

## 1. Contactos (Contacts)

### `get_contacts`
Obtiene todos los contactos/clientes potenciales.
- **Parámetros:** `{}` (Ninguno)

### `create_contact`
Crea un nuevo contacto o cliente potencial.
- **Parámetros:**
  - `name` (string, **requerido**): Nombre completo.
  - `email` (string, opcional): Correo electrónico.
  - `phone` (string, opcional): Número de teléfono.
  - `type` (string, opcional): Tipo (por defecto 'lead').
  - `enabled` (boolean, opcional): Activo/Inactivo.
  - `address`, `city`, `province`, `country` (string, opcional): Dirección.
  - `notes` (string, opcional): Notas adicionales.

### `update_contact`
Actualiza un contacto existente.
- **Parámetros:**
  - `contact_id` (integer, **requerido**): El ID numérico del contacto.
  - `name`, `email`, `phone`, `type`, `enabled`, `address`, `city`, `province`, `country`, `notes` (Todos opcionales).

### `delete_contact`
Elimina un contacto.
- **Parámetros:**
  - `contact_id` (integer, **requerido**).

---

## 2. Calendarios y Citas (Calendar)

### `get_calendars`
Obtiene todos los calendarios configurados del negocio.
- **Parámetros:** `{}` (Ninguno)

### `get_appointments`
Obtiene todas las citas agendadas en los calendarios del negocio.
- **Parámetros:** `{}` (Ninguno)

### `create_appointment`
Agenda una nueva cita.
- **Parámetros:**
  - `businessCalendarId` (integer, **requerido**): ID del calendario en donde se agendará.
  - `contactName` (string, **requerido**): Nombre de la persona.
  - `contactEmail` (string, **requerido**): Correo válido.
  - `startTime` (string, **requerido**): ISO datetime, ej. `2026-06-15T10:00:00Z`.
  - `endTime` (string, **requerido**): ISO datetime.
  - `contactId` (integer, opcional): ID del contacto en la DB (si existe).
  - `contactPhone` (string, opcional).
  - `title`, `description`, `notes` (string, opcionales).
  - `status` (string, opcional): por defecto 'confirmed'.

### `update_appointment`
Modifica una cita existente.
- **Parámetros:**
  - `app_id` (integer, **requerido**): ID de la cita.
  - `startTime`, `endTime` (string ISO, opcionales).
  - `title`, `description`, `notes`, `status` (string, opcionales).

### `delete_appointment`
Cancela o elimina una cita.
- **Parámetros:**
  - `app_id` (integer, **requerido**).

---

## 3. Oportunidades (Opportunities)

### `get_pipelines`
Trae todos los embudos (Pipelines) y las Etapas (Stages) del negocio.
- **Parámetros:** `{}` (Ninguno)

### `get_opportunities`
Trae todas las oportunidades en el tablero.
- **Parámetros:** `{}` (Ninguno)

### `create_opportunity`
Crea una nueva oportunidad (tarjeta en el pipeline).
- **Parámetros:**
  - `businessId` (integer, **requerido**): ID del negocio.
  - `customerId` (integer, **requerido**): ID del contacto/lead asociado.
  - `stageId` (integer, **requerido**): ID de la etapa en donde caerá.
  - `name` (string, **requerido**): Título de la oportunidad (ej. "Negociación Empresa X").
  - `value` (number, opcional): Valor monetario esperado.
  - `status` (string, opcional): 'open', 'won', 'lost', etc.
  - `order` (number, opcional).

### `update_opportunity`
Actualiza el nombre, valor o estado general.
- **Parámetros:**
  - `opp_id` (integer, **requerido**): ID de la oportunidad.
  - `name`, `status` (string, opcionales).
  - `value`, `stageId`, `order` (number, opcionales).

### `move_opportunity`
Mueve la oportunidad de una etapa a otra dentro del Pipeline.
- **Parámetros:**
  - `opp_id` (integer, **requerido**): ID de la oportunidad.
  - `stageId` (integer, **requerido**): ID de la *nueva* etapa de destino.
  - `order` (integer, opcional).

### `delete_opportunity`
Elimina la oportunidad del tablero.
- **Parámetros:**
  - `opp_id` (integer, **requerido**).
