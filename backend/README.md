# Webinar Registration - Backend

This folder contains the backend server for the Webinar Registration System.

## Structure

```
backend/
├── server.js              # Backend-local entry forwarding to the root Express server
├── db.js                  # MySQL database connection and operations
├── email.js               # Email service for sending registration receipts
├── receipt-pdf.js          # Generates downloadable PDF receipts
├── package.json           # Backend dependencies
├── package-lock.json      # Locked backend dependency versions
└── scripts/
    └── clear-registrations.js  # Utility to clear all registrations from DB
```

## Setup

1. Install dependencies (run from root folder):
   ```bash
   npm install
   npm --prefix backend install
   ```

2. Make sure your `.env` file is configured in the root folder with:
   ```
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=webinar_reg
   
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM=your_email@gmail.com

   ADMIN_PASSWORD=use-a-unique-random-password-at-least-12-characters
   
   PORT=3000
   NODE_ENV=development
   ```

## Running

From the root folder:

```bash
# Start the API-only backend from the project root
npm run backend:dev

# In another terminal, start the standalone frontend
npm run dev
# Open http://localhost:5173; Vite proxies /api requests to port 3000.

# Optional combined server (port 3000 must be free)
npm run dev:fullstack

# Clear all registrations from database
npm run backend:clear
```

## Hostinger deployment

Deploy this repository from its **project root**, not from the `backend/` subfolder. The server loads `.env` from the project root and serves the built frontend from the root `dist/` directory.

From the project root, install dependencies and build the frontend:

```bash
npm install
npm --prefix backend install
npm run build
```

Use `npm start` as the start command and the repository-root `server.js` as the application entry file. The Express routes, production static serving, and `app.listen(PORT, '0.0.0.0')` are defined in that root file. The backend-local `server.js` forwards existing backend scripts to it. Production serves the built frontend from the root `dist/` directory. Health endpoints are `/health` and `/api/health`.

In Hostinger's build environment, set `VITE_API_URL=https://webinarenrollment.vedhaai.in` before running `npm run build`. `GET /config` is a simple server status endpoint; the frontend fetches its dynamic configuration from `/api/config`. Because the frontend and API share this origin, no CORS configuration is needed.

Configure these values in Hostinger's environment settings. Do not commit them in `.env`:

```env
NODE_ENV=production
APP_URL=https://your-domain.example
DB_HOST=your-hostinger-mysql-host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
ADMIN_PASSWORD=use-a-unique-random-password-at-least-12-characters
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=your-sender-address
```

Hostinger supplies `PORT`; leave it unset in production unless its Node.js application setup explicitly asks you to enter the assigned value. Make sure the MySQL database and user exist in Hostinger before starting the app. Locally, run `npm start` from the project root after installing dependencies and setting up `.env` to test the production server on `http://localhost:3000`.

## API Endpoints

- `GET /config` - Return server status
- `GET /api/config` - Get application configuration
- `PUT /api/config` - Update configuration (admin)
- `GET /api/registrations` - Get all registrations
- `POST /api/registrations` - Create new registration
- `PATCH /api/registrations/:id/status` - Update registration status
- `DELETE /api/registrations/:id` - Delete registration
- `POST /api/registrations/:id/resend-email` - Resend receipt email
- `GET /api/stats` - Get registration statistics
- `GET /api/share-link` - Get student registration link
- `GET /api/registrations/:id/receipt` - Download a registration PDF

Registrations are stored as `pending` until an administrator verifies the payment. Students enter the UTR shown by their UPI app; screenshot uploads are not required. The server does not generate a fake transaction reference.

Admin routes require the `ADMIN_PASSWORD` from the root `.env`. The server creates an HttpOnly, same-site session cookie after login. Set `NODE_ENV=production`, use HTTPS, and configure a strong admin password before deployment.

## Database

The backend automatically creates the MySQL database and tables on first run. It uses the `webinar_reg` database with tables:
- `app_config` - Application configuration
- `registrations` - Student registrations

The database initialization creates the tables and applies additive compatibility migrations. Runtime configuration is stored in `app_config`; changing `data/config.json` after the first database seed does not overwrite admin-saved settings.
