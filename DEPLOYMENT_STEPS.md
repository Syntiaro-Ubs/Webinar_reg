# Deployment steps

The old password-based deployment checklist is obsolete. Follow the current database-backed admin rollout steps in [backend/README.md](backend/README.md#safe-admin-account-rollout).

The current flow uses a one-time CLI script to create the first admin account. Do not place admin, email, payment, or database credentials in this file or commit them to Git.
