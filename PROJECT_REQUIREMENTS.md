# EAMA Garments Admin Portal — Full Development Specification for Codex

You are working on an existing admin dashboard project for **EAMA Garments**, a B2B apparel manufacturing company.

The current dashboard UI is only a prototype. Transform it into a fully functional manufacturing management portal. Do not create a fake dashboard with static data. Build real application logic, relational database structure, CRUD operations, and connections between website forms, the client dashboard, the admin dashboard, sample gallery, website CMS, factory visit scheduling, and client communication. The system should be production-ready.

## Core system architecture

### Client side

Clients interact with the Sample Gallery, Request Sample & Quote form, Submit Design / Upload Tech Pack form, General Inquiry form, Factory Visit Booking form, and Client Dashboard.

### Admin side

Admins manage client requests, client communication, Sample Gallery, website content, factory visits, files and documents, email notifications, and admin users.

## Database logic

Create a relational database. Every submission creates a unique record with:

```text
Request ID
Client ID
Request Type
Created Date
Updated Date
Current Status
Assigned Admin
```

### Users

Store `id`, `name`, `email`, `password/auth provider`, and `role`. Roles are Super Admin, Admin Staff, and Client.

### Clients

Store company name, contact person, email, phone, country, website, and created date.

### Sample Gallery

Sample Gallery replaces product, collection, and sample management: everything is managed as a Sample. Store:

```text
id
sample_name
category
description
images
available_sizes
available_colors
fabric_options
manufacturing_details
featured
published_status
created_date
updated_date
```

Admins can add, edit, publish, hide, and archive samples. The add/edit flow supports name, category, description, multiple image upload, sizes, colors, fabric options, and manufacturing information. Changes must save to the database and published samples automatically appear on the website gallery.

Do not permanently delete samples by default. Use Published, Hidden, and Archived statuses. Implement image preview, drag-and-drop ordering, featured samples, search, and category filtering.

## Request types and connections

### Manufacturing inquiry

Connect **Request Sample and Quote** to a `MANUFACTURING_INQUIRY` request. Store selected sample, request type, sample quantity, sample size, sample color, sample notes, production quantity, fabric preference, customization details, packaging requirements, timeline requirements, variations, company information, and additional requirements.

On submit, link Client → Request → Selected Sample → Documents and notify the assigned/admin team.

### Tech pack / design submission

Connect **Submit Your Design & Request a Quote** to a `DESIGN_SUBMISSION` request. Store brand name, contact person, email, phone, country, garment category, product type, number of styles, target quantity, uploaded files, fabric requirements, GSM, colors, materials, customization, packaging, timeline, and notes.

Admins can view and download files, reply, upload quotations, and update status.

### General inquiry

Connect Name, Company, Email, Country, and Message to a `GENERAL_INQUIRY` request. Admins can view, reply to, and close the inquiry.

### Factory visit

Connect **Book a Factory Visit** to a `FACTORY_VISIT` request. Store name, company, email, phone, country, preferred date, preferred time, number of visitors, purpose, and notes.

Admins need a calendar for upcoming visits and pending requests. They can approve, reject, or reschedule visits, and create available slots (for example Monday at 10:00 AM and 2:00 PM). Unavailable slots must automatically disappear from the booking form.

## Unified request management

Build one unified request system, not disconnected pages. Show all requests in a table with Request ID, Company, Request Type, Date, Status, Priority, and Assigned Admin. Filter by request type, status, country, and date.

Every request opens a detail view showing client information (company, contact, email, phone, country), request-specific information, and documents with preview and download. Each request owns a conversation where admins can send messages, attach files, and upload quotations.

## Status workflows

```text
Manufacturing Inquiry: Submitted → Technical Review → Quotation Sent → Sample Development → Production → Completed
Design Submission: Submitted → File Review → Technical Evaluation → Quotation Sent → Completed
Factory Visit: Submitted → Pending Confirmation → Confirmed → Completed
General Inquiry: Received → Responded → Closed
```

## Client dashboard

Provide overview widgets for Active Requests, Pending Actions, and Completed Requests. Show a visual request timeline. Clients can upload additional files, view/download quotations and documents, and hold a separate conversation within each request.

## Website CMS

Give admins website content management with publishing that reflects immediately on the website:

- Homepage editor: hero title, description, images, and buttons.
- About editor: company information and images.
- Manufacturing Process editor: steps, images, and descriptions.
- Quality editor: text and certifications.
- Sustainability editor.
- Contact editor: phone, email, address, WhatsApp, and social links.

## Media library

Provide upload, preview, delete, search, and organization for website images, sample images, client files, and documents.

## Email system

Implement triggers:

- New request submitted: email admin.
- Admin status update: email client.
- Quotation uploaded: notify client.
- Factory visit confirmed: send confirmation email.

## UI requirements

Improve the existing UI; it must not look like a basic AI-generated template. Add professional, restrained animations: smooth page transitions, card hover effects, animated counters, timeline animations, loading skeletons, upload progress, and toast notifications.

Dashboard widgets include Request Pipeline, Pending Actions, Recent Activity Timeline, Website Activity, and Upcoming Factory Visits.

## Development rules

- Do not leave empty navigation pages.
- Every menu item must work.
- Every button must perform an action.
- Every form must connect to the correct database table.
- Do not use placeholder data; replace dummy content with real database connections.
- Build reusable, clean, maintainable components.

## Final goal

Deliver a professional B2B garment manufacturing management system where clients can submit designs, request samples and quotations, book factory visits, and track progress; and admins can manage every request, update clients, manage samples and website content, schedule factory visits, and communicate with customers.
