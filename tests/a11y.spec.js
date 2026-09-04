const fs = require('fs');
const path = require('path');
const { test, expect } = require('./fixtures');
const { test: authedTest, expect: authedExpect } = require('./authed.fixtures');
const AxeBuilder = require('@axe-core/playwright').default;

const BASELINE_PATH = path.join(__dirname, 'a11y-baseline.json');

/**
 * Поточні порушення сайту зафіксовані як baseline, тому тести зелені на наявному
 * стані, але падають, щойно зʼявляється НОВЕ правило або зростає кількість вузлів.
 * Оновити baseline (після свідомого фіксу чи регресії) — ОБОВʼЯЗКОВО в один потік:
 *   UPDATE_A11Y_BASELINE=1 npx playwright test a11y --workers=1
 *
 * `--workers=1` не забаганка: гілка оновлення читає весь baseline і перезаписує його
 * цілком, тож паралельні воркери затирали б записи одне одного, і частина сторінок
 * тихо зникла б із файлу.
 */
function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
}

function writeBaseline(baseline) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf-8');
}

/** @param {import('axe-core').Result[]} violations */
function summarize(violations) {
  return Object.fromEntries(
    violations
      .map((v) => [v.id, v.nodes.length])
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
  );
}

const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'category', path: '/news/category/pokmon' },
  { name: 'search', path: '/news/search?q=Mario' },
  { name: 'editorial', path: '/editorial' },
  { name: 'tournaments', path: '/tournaments' },
  { name: 'ratings-ssbu', path: '/tournaments/ratings-ssbu' },
  { name: 'games', path: '/games' },
  { name: 'category-tv', path: '/news/category/telebachennya' },
  { name: 'login', path: '/web/login' },
];

test.describe('Доступність (axe-core)', () => {
  // Правила WCAG не залежать від рушія, тож серед десктопних браузерів достатньо одного.
  // Мобільний проєкт лишається: інший макет дає інший набір порушень контрасту,
  // тому baseline ключується ще й за назвою проєкту.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Достатньо одного рушія');

  for (const target of PAGES) {
    test(`${target.name}: немає нових порушень порівняно з baseline`, async ({ page }, testInfo) => {
      const key = `${testInfo.project.name}/${target.name}`;
      await page.goto(target.path, { waitUntil: 'domcontentloaded' });

      // Скан має бути детермінованим. Деякі сторінки домальовуються скриптом уже ПІСЛЯ
      // `load`: на мобільному /games панель фільтрів згортається приблизно через
      // 300–400 мс після нього, ховаючи частину контролів. Без паузи axe ловить то
      // розгорнутий, то згорнутий варіант, і набір правил стрибає між прогонами.
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForTimeout(2_000);

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const current = summarize(violations);
      const baseline = readBaseline();

      if (process.env.UPDATE_A11Y_BASELINE) {
        writeBaseline({ ...baseline, [key]: current });
        test.skip(true, 'Baseline оновлено');
        return;
      }

      const known = baseline[key] ?? {};

      // Головний сигнал — поява НОВОГО типу порушення.
      const newRules = Object.keys(current).filter((id) => !(id in known));
      expect(newRules, `Нові a11y-порушення на ${key}`).toEqual([]);

      // Кількість вузлів пропорційна обсягу контенту (більше карток новин — більше
      // елементів із поганим контрастом), тому вона природно коливається день у день.
      // Допуск відсікає цей шум, але лишає видимим справжній стрибок.
      for (const [id, count] of Object.entries(current)) {
        const limit = Math.ceil(known[id] * 1.25) + 2;
        expect(
          count,
          `Порушень "${id}" на ${key}: ${count} проти ${known[id]} у baseline`
        ).toBeLessThanOrEqual(limit);
      }
    });
  }
});

/**
 * Окремий describe: /cabinet потребує сесії, тож використовує authedTest із
 * authed.fixtures.js замість базового test, — інакше сторінка редіректить на
 * /web/login і скан оцінює форму логіну, а не кабінет.
 */
authedTest.describe('Доступність (axe-core) — автентифіковані сторінки', () => {
  authedTest.skip(({ browserName }) => browserName !== 'chromium', 'Достатньо одного рушія');

  authedTest(
    'cabinet-games: немає нових порушень порівняно з baseline',
    async ({ page }, testInfo) => {
      const key = `${testInfo.project.name}/cabinet-games`;
      await page.goto('/cabinet?tab=games', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForTimeout(2_000);

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const current = summarize(violations);
      const baseline = readBaseline();

      if (process.env.UPDATE_A11Y_BASELINE) {
        writeBaseline({ ...baseline, [key]: current });
        authedTest.skip(true, 'Baseline оновлено');
        return;
      }

      const known = baseline[key] ?? {};

      const newRules = Object.keys(current).filter((id) => !(id in known));
      authedExpect(newRules, `Нові a11y-порушення на ${key}`).toEqual([]);

      for (const [id, count] of Object.entries(current)) {
        const limit = Math.ceil(known[id] * 1.25) + 2;
        authedExpect(
          count,
          `Порушень "${id}" на ${key}: ${count} проти ${known[id]} у baseline`
        ).toBeLessThanOrEqual(limit);
      }
    }
  );
});
