# EAMA Garments Operations Portal

This directory contains the authenticated, database-backed admin portal and its API.

## Setup

1. Create a MySQL database named `eama_garments` (or change the constants in `db.php`).
2. Import `schema.sql`. It creates users, clients, requests, messages, documents, samples, visit slots, CMS content, and activity-log tables.
3. Create an administrator using a PHP password hash:

```sql
INSERT INTO users (name, email, password, role)
VALUES ('Admin User', 'admin@eama.com', '<password_hash>', 'admin');
```

4. Serve the project through PHP/Apache or Nginx; public forms make same-origin requests to `admin/api.php` and therefore will not persist data when opened directly as local `file://` pages.
5. Sign in at `admin/index.php`. `dashboard.php` redirects to the working Operations ERP at `app.php`.

## What is connected

- `request-quote.html` creates `MANUFACTURING_INQUIRY` records.
- `techpack.html` creates `DESIGN_SUBMISSION` records and uploads attached files.
- `factory-visit.html` creates `FACTORY_VISIT` records and loads admin-created time slots.
- The inquiry form in `index.html` creates `GENERAL_INQUIRY` records.

The admin application includes dynamic overview metrics, unified request management with statuses, notes and replies, sample creation/archive/publishing, factory-slot management, client records, and publishable CMS records. Uploads are stored under `uploads/YYYY/MM` at runtime and recorded in `documents`.

## Deployment note

Set restrictive permissions on the runtime `uploads` directory and configure outbound email before adding production email notifications. The current API persists each event in `activity_logs`; a transactional email provider should consume those events in production.
