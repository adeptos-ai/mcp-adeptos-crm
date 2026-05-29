# GoHighLevel MCP Server — Categories & Tools

## ENABLED_CATEGORIES

Controls which tool categories the MCP server exposes. Set it in `.env`:

```env
# Expose ALL categories (default when empty or unset)
ENABLED_CATEGORIES=

# Expose only specific categories (comma-separated)
ENABLED_CATEGORIES=contacts,calendar,conversations

# Single category
ENABLED_CATEGORIES=contacts
```

When a category is **disabled**, its `discover_*` meta-tool disappears from `tools/list` and its tools return `MethodNotFound` if called directly. The server logs which categories are active at startup.

### Valid category names

| Category | Meta-tool | Tools |
|---|---|---|
| `contacts` | `discover_contacts_tools` | 31 |
| `conversations` | `discover_conversations_tools` | 20 |
| `blog` | `discover_blog_tools` | 7 |
| `calendar` | `discover_calendar_tools` | 39 |
| `opportunities` | `discover_opportunities_tools` | 10 |
| `email` | `discover_email_tools` | 5 |
| `location` | `discover_location_tools` | 24 |
| `email-isv` | `discover_email_isv_tools` | 1 |
| `social-media` | `discover_social_media_tools` | 17 |
| `media` | `discover_media_tools` | 3 |
| `objects` | `discover_objects_tools` | 9 |
| `associations` | `discover_associations_tools` | 10 |
| `custom-fields-v2` | `discover_custom_fields_v2_tools` | 8 |
| `workflows` | `discover_workflows_tools` | 1 |
| `surveys` | `discover_surveys_tools` | 2 |
| `store` | `discover_store_tools` | 18 |
| `products` | `discover_products_tools` | 10 |
| `payments` | `discover_payments_tools` | 20 |
| `invoices` | `discover_invoices_tools` | 18 |

If you set an unknown name, the server logs a warning with the valid options.

---

## Tool Reference by Category

### contacts (31 tools)

Contact management: CRUD, tags, tasks, notes, followers, campaigns, and workflows.

| Tool | Description |
|---|---|
| `create_contact` | Create a new contact in GoHighLevel |
| `search_contacts` | Search for contacts with advanced filtering options |
| `get_contact` | Get detailed information about a specific contact |
| `update_contact` | Update contact information |
| `delete_contact` | Delete a contact from GoHighLevel |
| `upsert_contact` | Create or update contact based on email/phone (smart merge) |
| `get_duplicate_contact` | Check for duplicate contacts by email or phone |
| `get_contacts_by_business` | Get contacts associated with a specific business |
| `get_contact_appointments` | Get all appointments for a contact |
| `add_contact_tags` | Add tags to a contact |
| `remove_contact_tags` | Remove tags from a contact |
| `bulk_update_contact_tags` | Bulk add or remove tags from multiple contacts |
| `bulk_update_contact_business` | Bulk update business association for multiple contacts |
| `get_contact_tasks` | Get all tasks for a contact |
| `create_contact_task` | Create a new task for a contact |
| `get_contact_task` | Get a specific task for a contact |
| `update_contact_task` | Update a task for a contact |
| `delete_contact_task` | Delete a task for a contact |
| `update_task_completion` | Update task completion status |
| `get_contact_notes` | Get all notes for a contact |
| `create_contact_note` | Create a new note for a contact |
| `get_contact_note` | Get a specific note for a contact |
| `update_contact_note` | Update a note for a contact |
| `delete_contact_note` | Delete a note for a contact |
| `add_contact_followers` | Add followers to a contact |
| `remove_contact_followers` | Remove followers from a contact |
| `add_contact_to_campaign` | Add contact to a marketing campaign |
| `remove_contact_from_campaign` | Remove contact from a specific campaign |
| `remove_contact_from_all_campaigns` | Remove contact from all campaigns |
| `add_contact_to_workflow` | Add contact to a workflow |
| `remove_contact_from_workflow` | Remove contact from a workflow |

---

### conversations (20 tools)

Messaging: send SMS/email, manage conversations and messages, call recordings and transcriptions.

| Tool | Description |
|---|---|
| `send_sms` | Send an SMS message to a contact |
| `send_email` | Send an email message to a contact |
| `search_conversations` | Search conversations with various filters |
| `get_conversation` | Get detailed conversation information including message history |
| `create_conversation` | Create a new conversation with a contact |
| `update_conversation` | Update conversation properties (star, mark read, etc.) |
| `delete_conversation` | Delete a conversation permanently |
| `get_recent_messages` | Get recent messages across all conversations for monitoring |
| `get_email_message` | Get detailed email message information by email message ID |
| `get_message` | Get detailed message information by message ID |
| `upload_message_attachments` | Upload file attachments for use in messages |
| `update_message_status` | Update the delivery status of a message |
| `add_inbound_message` | Manually add an inbound message to a conversation |
| `add_outbound_call` | Manually add an outbound call record to a conversation |
| `get_message_recording` | Get call recording audio for a message |
| `get_message_transcription` | Get call transcription text for a message |
| `download_transcription` | Download call transcription as a text file |
| `cancel_scheduled_message` | Cancel a scheduled message before it is sent |
| `cancel_scheduled_email` | Cancel a scheduled email before it is sent |
| `live_chat_typing` | Send typing indicator for live chat conversations |

---

### blog (7 tools)

Blog management: create/update posts, manage sites, authors, categories, and URL slugs.

| Tool | Description |
|---|---|
| `get_blog_sites` | Get all blog sites for the current location |
| `get_blog_authors` | Get all available blog authors for the current location |
| `get_blog_categories` | Get all available blog categories for the current location |
| `get_blog_posts` | Get blog posts from a specific blog site |
| `create_blog_post` | Create a new blog post (requires blog ID, author ID, and category IDs) |
| `update_blog_post` | Update an existing blog post |
| `check_url_slug` | Check if a URL slug is available for use |

---

### calendar (39 tools)

Calendar and appointments: calendars, groups, events, block slots, free slots, resources, rooms, notifications.

| Tool | Description |
|---|---|
| **Calendars** | |
| `get_calendars` | Get all calendars with optional filtering |
| `create_calendar` | Create a new calendar |
| `get_calendar` | Get detailed information about a specific calendar |
| `update_calendar` | Update an existing calendar |
| `delete_calendar` | Delete a calendar |
| **Calendar Groups** | |
| `get_calendar_groups` | Get all calendar groups |
| `create_calendar_group` | Create a new calendar group |
| `validate_group_slug` | Validate if a calendar group slug is available |
| `update_calendar_group` | Update calendar group details |
| `delete_calendar_group` | Delete a calendar group |
| `disable_calendar_group` | Enable or disable a calendar group |
| **Appointments** | |
| `get_calendar_events` | Get appointments/events within a date range |
| `create_appointment` | Create a new appointment/booking |
| `get_appointment` | Get detailed information about an appointment |
| `update_appointment` | Update an existing appointment |
| `delete_appointment` | Cancel/delete an appointment |
| `get_free_slots` | Get available time slots for booking |
| **Block Slots** | |
| `create_block_slot` | Block time to prevent bookings |
| `update_block_slot` | Update a blocked time slot |
| `get_blocked_slots` | Get blocked time slots for a location |
| **Appointment Notes** | |
| `get_appointment_notes` | Get notes for an appointment |
| `create_appointment_note` | Create a note for an appointment |
| `update_appointment_note` | Update an appointment note |
| `delete_appointment_note` | Delete an appointment note |
| **Equipment Resources** | |
| `get_calendar_resources_equipments` | Get calendar equipment resources |
| `create_calendar_resource_equipment` | Create an equipment resource |
| `get_calendar_resource_equipment` | Get specific equipment resource details |
| `update_calendar_resource_equipment` | Update equipment resource details |
| `delete_calendar_resource_equipment` | Delete an equipment resource |
| **Room Resources** | |
| `get_calendar_resources_rooms` | Get calendar room resources |
| `create_calendar_resource_room` | Create a room resource |
| `get_calendar_resource_room` | Get specific room resource details |
| `update_calendar_resource_room` | Update room resource details |
| `delete_calendar_resource_room` | Delete a room resource |
| **Notifications** | |
| `get_calendar_notifications` | Get calendar notifications |
| `create_calendar_notifications` | Create calendar notifications |
| `get_calendar_notification` | Get a specific calendar notification |
| `update_calendar_notification` | Update a calendar notification |
| `delete_calendar_notification` | Delete a calendar notification |

---

### opportunities (10 tools)

Opportunity/pipeline management: search, create, update opportunities, manage pipelines and followers.

| Tool | Description |
|---|---|
| `search_opportunities` | Search opportunities with filters (pipeline, stage, contact, status) |
| `get_pipelines` | Get all sales pipelines configured in GoHighLevel |
| `get_opportunity` | Get detailed information about a specific opportunity |
| `create_opportunity` | Create a new opportunity in the CRM |
| `update_opportunity` | Update an existing opportunity with new details |
| `update_opportunity_status` | Update the status of an opportunity (won, lost, etc.) |
| `upsert_opportunity` | Create or update opportunity based on contact and pipeline (smart merge) |
| `delete_opportunity` | Delete an opportunity |
| `add_opportunity_followers` | Add followers to an opportunity |
| `remove_opportunity_followers` | Remove followers from an opportunity |

---

### email (5 tools)

Email campaigns and templates management.

| Tool | Description |
|---|---|
| `get_email_campaigns` | Get a list of email campaigns |
| `get_email_templates` | Get a list of email templates |
| `create_email_template` | Create a new email template |
| `update_email_template` | Update an existing email template |
| `delete_email_template` | Delete an email template |

---

### location (24 tools)

Location/sub-account management: locations, tags, tasks, custom fields, custom values, templates, timezones.

| Tool | Description |
|---|---|
| **Locations** | |
| `search_locations` | Search for locations/sub-accounts with filtering |
| `get_location` | Get detailed information about a location |
| `create_location` | Create a new sub-account/location (Agency Pro required) |
| `update_location` | Update an existing location |
| `delete_location` | Delete a location |
| **Tags** | |
| `get_location_tags` | Get all tags for a location |
| `create_location_tag` | Create a new tag |
| `get_location_tag` | Get a specific tag by ID |
| `update_location_tag` | Update a tag |
| `delete_location_tag` | Delete a tag |
| **Tasks** | |
| `search_location_tasks` | Search tasks within a location with advanced filtering |
| **Custom Fields** | |
| `get_location_custom_fields` | Get custom fields, optionally filtered by model type |
| `create_location_custom_field` | Create a new custom field |
| `get_location_custom_field` | Get a specific custom field |
| `update_location_custom_field` | Update a custom field |
| `delete_location_custom_field` | Delete a custom field |
| **Custom Values** | |
| `get_location_custom_values` | Get all custom values |
| `create_location_custom_value` | Create a new custom value |
| `get_location_custom_value` | Get a specific custom value |
| `update_location_custom_value` | Update a custom value |
| `delete_location_custom_value` | Delete a custom value |
| **Templates & Timezones** | |
| `get_location_templates` | Get SMS/Email templates |
| `delete_location_template` | Delete a template |
| `get_timezones` | Get available timezones |

---

### email-isv (1 tool)

Email verification for deliverability.

| Tool | Description |
|---|---|
| `verify_email` | Verify email address deliverability and get risk assessment (charges deducted from location wallet) |

---

### social-media (17 tools)

Social media management: posts, accounts, CSV operations, categories, tags, and OAuth.

| Tool | Description |
|---|---|
| **Posts** | |
| `search_social_posts` | Search and filter social media posts across all platforms |
| `create_social_post` | Create a new social media post for multiple platforms |
| `get_social_post` | Get details of a specific post |
| `update_social_post` | Update an existing post |
| `delete_social_post` | Delete a post |
| `bulk_delete_social_posts` | Delete multiple posts at once (max 50) |
| **Accounts** | |
| `get_social_accounts` | Get all connected social media accounts and groups |
| `delete_social_account` | Delete a social media account connection |
| `start_social_oauth` | Start OAuth process for a social media platform |
| `get_platform_accounts` | Get available accounts for a platform after OAuth |
| **CSV Bulk** | |
| `upload_social_csv` | Upload CSV file for bulk social media posts |
| `get_csv_upload_status` | Get status of CSV uploads |
| `set_csv_accounts` | Set accounts for CSV import processing |
| **Categories & Tags** | |
| `get_social_categories` | Get social media post categories |
| `get_social_category` | Get a specific category by ID |
| `get_social_tags` | Get social media post tags |
| `get_social_tags_by_ids` | Get specific tags by their IDs |

---

### media (3 tools)

Media library: list, upload, and delete files.

| Tool | Description |
|---|---|
| `get_media_files` | Get list of files and folders with filtering and search |
| `upload_media_file` | Upload a file or add a hosted file URL (max 25MB) |
| `delete_media_file` | Delete a file or folder |

---

### objects (9 tools)

Custom objects: manage object schemas and records.

| Tool | Description |
|---|---|
| `get_all_objects` | Get all objects (custom and standard) for a location |
| `create_object_schema` | Create a new custom object schema |
| `get_object_schema` | Get object schema details by key |
| `update_object_schema` | Update object schema properties |
| `create_object_record` | Create a new record in an object |
| `get_object_record` | Get a specific record by ID |
| `update_object_record` | Update an existing record |
| `delete_object_record` | Delete a record |
| `search_object_records` | Search records using searchable properties |

---

### associations (10 tools)

Define and manage relationships between contacts, custom objects, and opportunities.

| Tool | Description |
|---|---|
| `ghl_get_all_associations` | Get all associations with pagination (system + user-defined) |
| `ghl_create_association` | Create a new association defining relationship types between entities |
| `ghl_get_association_by_id` | Get a specific association by ID |
| `ghl_update_association` | Update labels of a user-defined association |
| `ghl_delete_association` | Delete a user-defined association (also deletes all its relations) |
| `ghl_get_association_by_key` | Get an association by its key name |
| `ghl_get_association_by_object_key` | Get associations by object keys |
| `ghl_create_relation` | Create a relation between two entities using an association |
| `ghl_get_relations_by_record` | Get all relations for a specific record |
| `ghl_delete_relation` | Delete a relation between two entities |

---

### custom-fields-v2 (8 tools)

Custom fields V2: manage custom fields and field folders by object key.

| Tool | Description |
|---|---|
| `ghl_get_custom_field_by_id` | Get a custom field or folder by ID |
| `ghl_create_custom_field` | Create a new custom field (text, number, options, date, file upload, etc.) |
| `ghl_update_custom_field` | Update a custom field (name, description, options, etc.) |
| `ghl_delete_custom_field` | Delete a custom field permanently (removes field and its data) |
| `ghl_get_custom_fields_by_object_key` | Get all custom fields and folders for an object key |
| `ghl_create_custom_field_folder` | Create a folder for organizing fields |
| `ghl_update_custom_field_folder` | Update folder name |
| `ghl_delete_custom_field_folder` | Delete a folder (affects fields within it) |

---

### workflows (1 tool)

Workflow management: retrieve automation workflows.

| Tool | Description |
|---|---|
| `ghl_get_workflows` | Retrieve all workflows for a location |

---

### surveys (2 tools)

Survey management: retrieve surveys and submissions.

| Tool | Description |
|---|---|
| `ghl_get_surveys` | Retrieve all surveys for a location |
| `ghl_get_survey_submissions` | Retrieve survey submissions with filtering and pagination |

---

### store (18 tools)

Store management: shipping zones, rates, carriers, and settings.

| Tool | Description |
|---|---|
| **Shipping Zones** | |
| `ghl_create_shipping_zone` | Create a new shipping zone with countries and states |
| `ghl_list_shipping_zones` | List all shipping zones |
| `ghl_get_shipping_zone` | Get details of a shipping zone |
| `ghl_update_shipping_zone` | Update a shipping zone |
| `ghl_delete_shipping_zone` | Delete a shipping zone and its rates |
| **Shipping Rates** | |
| `ghl_get_available_shipping_rates` | Get rates for an order based on destination |
| `ghl_create_shipping_rate` | Create a rate for a zone |
| `ghl_list_shipping_rates` | List all rates for a zone |
| `ghl_get_shipping_rate` | Get details of a rate |
| `ghl_update_shipping_rate` | Update a rate |
| `ghl_delete_shipping_rate` | Delete a rate |
| **Shipping Carriers** | |
| `ghl_create_shipping_carrier` | Create a carrier for dynamic rate calculation |
| `ghl_list_shipping_carriers` | List all carriers |
| `ghl_get_shipping_carrier` | Get carrier details |
| `ghl_update_shipping_carrier` | Update a carrier |
| `ghl_delete_shipping_carrier` | Delete a carrier |
| **Store Settings** | |
| `ghl_create_store_setting` | Create or update store settings (shipping origin, notifications) |
| `ghl_get_store_setting` | Get current store settings |

---

### products (10 tools)

Product management: products, prices, inventory, and collections.

| Tool | Description |
|---|---|
| `ghl_create_product` | Create a new product |
| `ghl_list_products` | List products with optional filtering |
| `ghl_get_product` | Get a specific product by ID |
| `ghl_update_product` | Update an existing product |
| `ghl_delete_product` | Delete a product |
| `ghl_create_price` | Create a price for a product |
| `ghl_list_prices` | List prices for a product |
| `ghl_list_inventory` | List inventory items with stock levels |
| `ghl_create_product_collection` | Create a new product collection |
| `ghl_list_product_collections` | List product collections |

---

### payments (20 tools)

Payment management: integration providers, orders, fulfillments, transactions, subscriptions, and coupons.

| Tool | Description |
|---|---|
| **Integration Providers** | |
| `create_whitelabel_integration_provider` | Create a white-label integration provider |
| `list_whitelabel_integration_providers` | List integration providers with pagination |
| **Orders** | |
| `list_orders` | List orders with filtering and pagination |
| `get_order_by_id` | Get a specific order |
| `create_order_fulfillment` | Create a fulfillment for an order |
| `list_order_fulfillments` | List all fulfillments for an order |
| **Transactions & Subscriptions** | |
| `list_transactions` | List transactions with filtering |
| `get_transaction_by_id` | Get a specific transaction |
| `list_subscriptions` | List subscriptions with filtering |
| `get_subscription_by_id` | Get a specific subscription |
| **Coupons** | |
| `list_coupons` | List all coupons with optional filtering |
| `create_coupon` | Create a promotional coupon |
| `update_coupon` | Update an existing coupon |
| `delete_coupon` | Delete a coupon permanently |
| `get_coupon` | Get coupon details by ID or code |
| **Custom Providers** | |
| `create_custom_provider_integration` | Create a custom payment provider integration |
| `delete_custom_provider_integration` | Delete a custom payment provider integration |
| `get_custom_provider_config` | Fetch payment config for a location |
| `create_custom_provider_config` | Create payment config for a location |
| `disconnect_custom_provider_config` | Disconnect payment config for a location |

---

### invoices (18 tools)

Invoice and estimate management: templates, schedules, invoices, estimates.

| Tool | Description |
|---|---|
| **Templates** | |
| `create_invoice_template` | Create a new invoice template |
| `list_invoice_templates` | List all invoice templates |
| `get_invoice_template` | Get a template by ID |
| `update_invoice_template` | Update a template |
| `delete_invoice_template` | Delete a template |
| **Schedules** | |
| `create_invoice_schedule` | Create a new invoice schedule |
| `list_invoice_schedules` | List all schedules |
| `get_invoice_schedule` | Get a schedule by ID |
| **Invoices** | |
| `create_invoice` | Create a new invoice |
| `list_invoices` | List all invoices |
| `get_invoice` | Get an invoice by ID |
| `send_invoice` | Send an invoice to customer |
| **Estimates** | |
| `create_estimate` | Create a new estimate |
| `list_estimates` | List all estimates |
| `send_estimate` | Send an estimate to customer |
| `create_invoice_from_estimate` | Create an invoice from an estimate |
| **Number Generation** | |
| `generate_invoice_number` | Generate a unique invoice number |
| `generate_estimate_number` | Generate a unique estimate number |
