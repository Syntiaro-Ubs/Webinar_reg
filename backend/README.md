# Webinar Registration - Backend

This folder contains the backend server for the Webinar Registration System.

## Structure

```
backend/
|-- server.js              # Backend-local entry forwarding to the root Express server
|-- db.js                  # MySQL database connection and operations
|-- email.js               # Email service for sending registration receipts
|-- receipt-pdf.js         # Generates downloadable PDF receipts
|-- package.json           # Backend dependencies
|-- package-lock.json      # Locked backend dependency versions
`-- scripts/
    `-- clear-registrations.js  # Utility to clear all registrations from DB
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

You can also start the API-only backend from this `backend/` folder with
`node server.js`. It listens on port 3000 by default; run the frontend separately
from the project root with `npm run dev` to serve it on port 5173.

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

For local payment testing, put the test credentials in the project-root `.env`:

```env
CASHFREE_ENV=sandbox
CASHFREE_TEST_APP_ID=your_sandbox_app_id
CASHFREE_TEST_SECRET_KEY=your_sandbox_secret_key
APP_URL=http://localhost:3000
```

`APP_URL` must match the browser-facing app origin. Use `http://localhost:5173` when running the Vite dev server, or port `3000` when the combined server serves the frontend. Sandbox mode allows localhost and HTTP. Cashfree's sandbox API base is `https://sandbox.cashfree.com/pg`.

Cashfree cannot send a webhook to a localhost address. For webhook testing, point `APP_URL` to a public HTTPS tunnel; the app then includes `notify_url`. With a localhost `APP_URL`, the browser return flow still verifies payment through Cashfree's API, and no unreachable webhook URL is sent.

For production, configure these values in Hostinger's environment settings. Do not commit them in `.env`:

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
CASHFREE_ENV=production
CASHFREE_LIVE_APP_ID=your_cashfree_live_app_id
CASHFREE_LIVE_SECRET_KEY=your_cashfree_live_secret_key
```

Keep Cashfree credentials on the backend only; never add them to `VITE_*` variables or frontend code. Production requires a public HTTPS `APP_URL`; localhost and private IP addresses are rejected. Cashfree production API requests use `https://api.cashfree.com/pg`. Missing or invalid `CASHFREE_ENV` defaults to sandbox, and the server logs a `TEST MODE` or `LIVE MODE` indicator at startup. The active mode's missing credential variable names are printed in the startup error, never the secret values. Hostinger supplies `PORT`; leave it unset in production unless its Node.js application setup explicitly asks you to enter the assigned value. Make sure the MySQL database and user exist in Hostinger before starting the app.

## API Endpoints

- `GET /config` - Return server status
- `GET /api/config` - Get application configuration
- `PUT /api/config` - Update configuration (admin)
- `GET /api/registrations` - Get all registrations
- `POST /api/registrations` - Create registration and Cashfree checkout order
- `GET /api/payments/cashfree/:orderId/status` - Verify checkout status server-side
- `POST /api/webhooks/cashfree` - Receive signed Cashfree payment events
- `GET /api/stats` - Get registration statistics
- `GET /api/share-link` - Get student registration link
- `GET /api/registrations/:id/receipt` - Download a registration PDF

Students pay through Cashfree checkout. The backend sets the fee, creates the order, validates signed webhooks, and checks the payment with Cashfree before marking it paid. A confirmed payment triggers one receipt email with a PDF attachment and the configured WhatsApp community invite. Students still need to open the invite and join the WhatsApp group themselves.

Admin routes require the `ADMIN_PASSWORD` from the root `.env`. The server creates an HttpOnly, same-site session cookie after login. Set `NODE_ENV=production`, use HTTPS, and configure a strong admin password before deployment.

## Database

The backend automatically creates the MySQL database and tables on first run. It uses the `webinar_reg` database with tables:
- `app_config` - Application configuration
- `registrations` - Student registrations

The database initialization creates the tables and applies additive compatibility migrations. Runtime configuration is stored in `app_config`; changing `data/config.json` after the first database seed does not overwrite admin-saved settings.
