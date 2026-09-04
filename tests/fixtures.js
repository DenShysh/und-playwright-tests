const base = require('@playwright/test');

/**
 * Тести, для яких банер згоди не є предметом перевірки, отримують контекст із уже
 * виставленою cookie згоди. Це прибирає з кожного beforeEach очікування банера, який
 * вставляється скриптом через ~1.5 с після завантаження: під навантаженням саме воно
 * розтягувало хук і валило тест узагальненим "timeout while running beforeEach hook".
 *
 * `optional: true` = повна згода, тож сторонні ембеди на сторінках статей теж активні.
 * Тести самого банера (consent.spec.js) навмисно імпортують базовий `test`, щоб
 * отримати чистий контекст без цієї cookie.
 */
const test = base.test.extend({
  context: async ({ context, baseURL }, use) => {
    const { hostname } = new URL(baseURL ?? 'https://und.com.ua');
    await context.addCookies([
      {
        name: 'website_cookies_bar',
        value: JSON.stringify({ required: true, optional: true, ts: Date.now() }),
        domain: hostname,
        path: '/',
      },
    ]);
    await use(context);
  },
});

module.exports = { test, expect: base.expect };
