const { test: base, expect } = require('./fixtures');

/**
 * Extends the consent-cookie context from ./fixtures with a real UND session cookie,
 * so tests can reach pages behind /cabinet and /my/* (Odoo's website_sale/portal auth).
 *
 * SESSION_ID comes from .env — copy a live `session_id` cookie value from your own
 * browser devtools. It belongs to a real account and WILL expire; if these tests start
 * redirecting to /web/login, grab a fresh value.
 */
const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    const sessionId = process.env.SESSION_ID;
    if (!sessionId) {
      throw new Error('SESSION_ID env var missing — set it in .env to run authenticated tests.');
    }
    const { hostname } = new URL(baseURL ?? 'https://und.com.ua');
    await context.addCookies([
      {
        name: 'session_id',
        value: sessionId,
        domain: hostname,
        path: '/',
        httpOnly: true,
        secure: true,
      },
    ]);
    await use(context);
  },
});

module.exports = { test, expect };
