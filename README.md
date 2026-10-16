# Webinar Registration System

A full-stack webinar registration application with student registration form, admin dashboard, and automated email receipts.

## Project Structure

```
webinar-registration/
├── backend/              # Backend server (Node.js + Express + MySQL)
│   ├── server.js        # Main server with API routes
│   ├── db.js            # Database operations
│   ├── email.js         # Email service
│   ├── package.json     # Backend dependencies
│   └── scripts/         # Utility scripts
├── src/                 # Frontend (React + Vite)
│   ├── components/      # React components
│   ├── utils/           # Utility functions
│   └── data/            # Frontend data configs
├── data/                # JSON data files (config, registrations)
├── .env                 # Environment variables
└── package.json         # Root dependencies
```

## Features

- 📝 Student registration form with payment details
- 👨‍💼 Admin dashboard for managing registrations
- 📧 Automated email receipts with QR codes
- 💳 UPI payment tracking
- 📊 Registration statistics
- 🎨 Modern, responsive UI with Tailwind CSS
- 🗄️ MySQL database for data persistence

## Setup

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8 or higher)
- Gmail account (for sending emails)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   npm --prefix backend install
   ```

3. Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=webinar_reg

   # Email Configuration (Gmail)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_gmail_app_password
   SMTP_FROM=your_email@gmail.com

   # Admin access (use a unique password with at least 12 characters)
   ADMIN_PASSWORD=replace-with-a-long-random-password

   # Optional: Gemini AI (for advanced features)
   GEMINI_API_KEY=your_gemini_api_key

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. Start the frontend and backend separately in two terminals from the project root:
   ```bash
   npm run backend:dev
   npm run dev
   ```

5. Access the application:
   - Student Registration: http://localhost:5173/register
   - Admin Dashboard: http://localhost:5173/admin

## Scripts

### Development
```bash
npm run dev              # Start standalone frontend at http://localhost:5173
npm run backend:dev      # Start API-only backend at http://localhost:3000
npm run backend:api      # Alias for backend:dev
npm run dev:fullstack    # Start combined backend + frontend at http://localhost:3000 (use only when port 3000 is free)
npm run frontend:dev     # Alias for dev
npm run build            # Build frontend for production
npm run preview          # Preview production build
```

To run the frontend and backend separately, open two terminals in the project root. Run `npm run backend:dev` in the first and `npm run dev` in the second. Open http://localhost:5173; Vite forwards `/api` requests to the backend on port 3000.

### Utilities
```bash
npm run backend:clear    # Clear all registrations from database
```

## API Endpoints

See [backend/README.md](backend/README.md) for detailed API documentation.

## Database

The application automatically creates the required MySQL database and tables on first run. No manual database setup needed!

## Email Configuration

To enable email receipts:

1. Enable 2-Factor Authentication in your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the generated password in `SMTP_PASS` in your `.env` file

Production must use `NODE_ENV=production`, a strong `ADMIN_PASSWORD` (12+ characters), an HTTPS `APP_URL`, HTTPS termination, a restricted MySQL account, and valid SMTP settings. The admin API protects student records and payment actions; keep the admin password private. Build the frontend with `npm run build` before starting the production backend.

## Technologies Used

### Backend
- Node.js & Express.js
- MySQL 2
- Nodemailer (Email)
- QRCode (Receipt QR codes)
- Google Gemini AI (Optional)

### Frontend
- React 19
- Vite
- Tailwind CSS
- Lucide React (Icons)
- Motion (Animations)
- Canvas Confetti (Success effects)

## License

Private project

## Support

For issues or questions, contact the administrator.
