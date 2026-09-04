const { test, expect } = require('./authed.fixtures');
const { CabinetPage, STATUS_VALUES } = require('../src/pages/CabinetPage');
const { GameDetailPage } = require('../src/pages/GameDetailPage');

/**
 * Authenticated tests for the personal cabinet (/cabinet). Requires SESSION_ID in
 * .env — see tests/authed.fixtures.js. If these start failing with a redirect to
 * /web/login, the session cookie has expired; grab a fresh one.
 *
 * ПРОДАКШН, реальний акаунт: жоден тест тут не змінює стан бібліотеки ігор
 * (комбобокс статусу, "Remove from library") чи аватар — усе це вплинуло б на
 * реальні дані користувача. Перевіряємо лише читання/навігацію.
 */
test.describe('Особистий кабінет', () => {
  /** @type {CabinetPage} */
  let cabinet;

  test.beforeEach(async ({ page }) => {
    cabinet = new CabinetPage(page);
    await cabinet.goto();
  });

  test('завантажується з коректним title і профілем користувача', async ({ page }) => {
    await expect(page).toHaveTitle('Cabinet');
    await expect(cabinet.userName).toBeVisible();
    await expect(cabinet.userEmail).toBeVisible();
    await expect(cabinet.changeAvatarButton).toBeVisible();
  });

  const tabs = [
    { locator: 'viewsTab', tab: 'views' },
    { locator: 'commentsTab', tab: 'comments' },
    { locator: 'repliesTab', tab: 'replies' },
    { locator: 'playersTab', tab: 'players' },
  ];
  for (const { locator, tab } of tabs) {
    test(`таб "${tab}" веде на /cabinet?tab=${tab}`, async ({ page }) => {
      await cabinet[locator].click();
      await expect(page).toHaveURL(new RegExp(`\\?tab=${tab}$`));
      await expect(page).toHaveTitle('Cabinet');
    });
  }

  test('таб Games показує усі пʼять розділів статусу', async () => {
    const statuses = ['Want', 'Playing', 'Own', 'Beaten', 'Dropped'];
    await expect(cabinet.gamesSections).toHaveCount(statuses.length);
    for (const status of statuses) {
      await expect(cabinet.gameSection(status)).toBeVisible();
    }
  });

  test('непорожній розділ показує картки ігор, порожній — заглушку "Nothing here yet."', async () => {
    const statuses = ['Want', 'Playing', 'Own', 'Beaten', 'Dropped'];
    for (const status of statuses) {
      const section = cabinet.gameSection(status);
      const isEmpty = await section.evaluate((el) => el.classList.contains('und-cab-section--empty'));
      if (isEmpty) {
        await expect(section.getByText('Nothing here yet.')).toBeVisible();
      } else {
        await expect(section.locator('.und-cab-game').first()).toBeVisible();
      }
    }
  });

  test('вибраний статус картки відповідає розділу, в якому вона показана', async () => {
    for (const [status, value] of Object.entries(STATUS_VALUES)) {
      const selects = cabinet.gameSection(status).locator('.und-cab-game__status');
      const count = await selects.count();
      for (let i = 0; i < count; i += 1) {
        await expect(selects.nth(i)).toHaveValue(value);
      }
    }
  });

  test('посилання на картки ігор і сповіщення ведуть на існуючі сторінки', async ({ request, baseURL }) => {
    const hrefs = await cabinet.collectGameHrefs();
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const response = await request.get(new URL(href, baseURL).toString());
      expect(response.ok(), `${href} → ${response.status()}`).toBeTruthy();
    }
  });

  test('клік по картці зі списку Want веде на сторінку гри з тим самим h1', async ({ page }) => {
    // Чекаємо на фінально відрендерену сторінку (після локале-редіректу), інакше
    // .count() нижче не ретраїть і може зловити порожній проміжний стан — та сама
    // гонка, що й у collectGameHrefs().
    await cabinet.gamesSections.first().waitFor({ state: 'attached' });

    const wantCard = cabinet.gameSection('Want').locator('.und-cab-game').first();
    test.skip((await wantCard.count()) === 0, 'Список Want порожній на цьому акаунті');

    const title = (await wantCard.getByRole('link').filter({ hasText: /./ }).first().textContent())?.trim();
    await wantCard.getByRole('link', { name: title, exact: true }).click();

    const game = new GameDetailPage(page);
    await expect(game.mainHeading).toHaveText(title);
  });
});
