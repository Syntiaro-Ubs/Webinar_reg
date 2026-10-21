# Deployment Troubleshooting: Admin Login

## Admin login returns 401 or 503

The `.env` file is excluded from Git, so production environment variables must be configured in your hosting provider's dashboard. Set `ADMIN_PASSWORD` to a strong secret with at least 12 characters, then restart the application.

Check the application logs and hosting configuration to confirm the variable is present. Do not expose its value or length in a public diagnostic endpoint. The `/api/check-env` endpoint is available only when `NODE_ENV=development`.

## Configure the hosting environment

Add the required variables in your hosting provider's environment or secrets settings. Use the names and values from your private deployment configuration; do not copy secrets into this guide or commit them to Git.

Common variables include:

```text
NODE_ENV
ADMIN_PASSWORD
APP_URL
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
CASHFREE_ENV
CASHFREE_TEST_APP_ID
CASHFREE_TEST_SECRET_KEY
CASHFREE_LIVE_APP_ID
CASHFREE_LIVE_SECRET_KEY
```

Use sandbox payment credentials for testing and live credentials only for production. Store credentials in your hosting provider's secret manager or environment settings.

## Verify the fix

1. Restart or redeploy the application after changing environment variables.
2. Check the server logs for startup and configuration errors.
3. Confirm the service responds at `/health`.
4. Try signing in with the configured admin password.

## Common issues

- A 503 response means `ADMIN_PASSWORD` is missing or shorter than 12 characters.
- A 401 response means the submitted password does not match the configured value.
- Check for whitespace in the hosting provider's value and restart after changes.
- Confirm the database and SMTP settings are configured if those features also fail.

Never commit `.env` files, passwords, SMTP credentials, or payment gateway secrets. If a secret has been exposed, rotate it in the relevant provider before using it again.
