// Keep the backend-local entry API-only; the repository-root server.js remains
// the combined development and Hostinger entry point.
process.argv.push('--api-only');
await import('../server.js');
