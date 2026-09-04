const { test, expect } = require('./authed.fixtures');
const { GamesPage } = require('../src/pages/GamesPage');
const { CabinetPage, STATUS_VALUES } = require('../src/pages/CabinetPage');

/**
 * Authenticated tests for the personal game-status feature shared between
 * /games (the "Мій статус" buttons on each card) and the cabinet (the Want/Own/
 * Playing/Beaten/Dropped dropdown + Remove from library): adding to the
 * wishlist, removing from it, and switching a game between all 5 categories.
 * Requires SESSION_ID in .env — see tests/authed.fixtures.js.
 *
 * ПРОДАКШН, реальний акаунт: усі тести, крім одного, працюють ЛИШЕ з тестовим
 * фікстур-айтемом — гра, яка ще НЕ позначена цим акаунтом
 * (GamesPage.firstUntouchedWishlistCard), додана й прибрана в межах одного
 * тесту. Виняток — "видалення гри зі списку Want", який навмисно бере РЕАЛЬНИЙ
 * айтем і повертає його назад через try/finally, щоб відновлення відбулось
 * незалежно від результату проміжних асертів.
 *
 * Локатори прив'язані до `data-game-id` (GamesPage.cardById / CabinetPage.
 * gameCardById) скрізь, де це можливо — НЕ до filter-локаторів чи заголовків.
 * Дві реальні пастки, знайдені живими прогонами під час розробки цього файлу:
 * `.filter({ has })` переоцінюється при КОЖНОМУ використанні (обраний "перший
 * незайнятий" перестає ним бути одразу після кліку, і той самий локатор у
 * наступному виклику підхоплює вже ІНШУ гру), а підрядковий збіг заголовка
 * (`hasText: 'Elden Ring'`) переплутав базову гру з "Elden Ring: Shadow of the
 * Erdtree" (обидві містять цей підрядок) — і сам "Elden Ring" на той момент ще й
 * випав з дефолтного вікна дат /games. `data-game-id` — єдиний стабільний,
 * унікальний ідентифікатор картки на обох сторінках.
 */
test.describe('Особистий статус гри', () => {
  // Усі тести мутують СПІЛЬНИЙ Want-список реального акаунта — це серверний
  // стан, не рендер, тож рушій браузера ні до чого. Паралельні project'и
  // (chromium/firefox/webkit/mobile-chrome) гнались би за тим самим айтемом
  // одночасно й псували стан одне одному. Один project, послідовно.
  //
  // Перевірка `project.name` навмисно всередині КОЖНОГО тесту (не describe-
  // рівневим test.skip(({}, testInfo) => ...)) — на describe-рівні testInfo як
  // другий аргумент не передається (Playwright кидає "Cannot read properties of
  // undefined (reading 'project')"); тестовий колбек його гарантовано отримує.
  test.describe.configure({ mode: 'serial' });

  /**
   * Прибирає тестовий фікстур-айтем із бібліотеки, якщо він там лишився —
   * викликається з finally, тож спрацьовує незалежно від результату асертів.
   * @param {import('@playwright/test').Page} page
   * @param {CabinetPage} cabinet
   * @param {string} gameId
   */
  async function cleanupLibraryItem(page, cabinet, gameId) {
    await cabinet.goto();
    await cabinet.gamesSections.first().waitFor({ state: 'attached' }).catch(() => {});
    const cabCard = cabinet.gameCardById(gameId);
    if ((await cabCard.count()) > 0) {
      page.once('dialog', (dialog) => dialog.accept());
      await cabCard.locator('.und-cab-game__remove').click();
      await expect(cabCard).toHaveCount(0);
    }
  }

  test('додавання гри в "Хочу" оновлює лічильник на картці й зʼявляється в кабінеті Want', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Мутує спільний акаунт — досить одного project.');
    const games = new GamesPage(page);
    const cabinet = new CabinetPage(page);
    await games.goto();

    const pick = await games.firstUntouchedWishlistCard();
    test.skip((await pick.count()) === 0, 'Немає жодної непозначеної гри на поточній видачі /games');
    const gameId = await pick.getAttribute('data-game-id');
    const title = (await pick.locator('.und-game-card__title').textContent())?.trim();
    const wishlistBtn = games.statusButton(games.cardById(gameId), 'wishlist');
    const countBefore = Number(await wishlistBtn.locator('.und-game-status-btn__count').textContent());

    try {
      await wishlistBtn.click();
      await expect(wishlistBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(wishlistBtn.locator('.und-game-status-btn__count')).toHaveText(String(countBefore + 1));

      await cabinet.goto();
      await cabinet.gamesSections.first().waitFor({ state: 'attached' });
      await expect(cabinet.gameSection('Want').getByRole('link', { name: title, exact: true })).toBeVisible();
    } finally {
      // Знімаємо позначку незалежно від результату асертів вище — інакше тестовий
      // фікстур-айтем назавжди осяде в реальному вішлисті акаунта.
      await cleanupLibraryItem(page, cabinet, gameId);
    }

    await games.goto();
    const btnFinal = games.statusButton(games.cardById(gameId), 'wishlist');
    await expect(btnFinal).toHaveAttribute('aria-pressed', 'false');
    await expect(btnFinal.locator('.und-game-status-btn__count')).toHaveText(String(countBefore));
  });

  test('видалення гри зі списку Want у кабінеті знімає позначку на /games, гру повертаємо назад', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Мутує спільний акаунт — досить одного project.');
    const cabinet = new CabinetPage(page);
    const games = new GamesPage(page);

    await cabinet.goto();
    await cabinet.gamesSections.first().waitFor({ state: 'attached' });
    const wantCard = cabinet.gameSection('Want').locator('.und-cab-game').first();
    test.skip((await wantCard.count()) === 0, 'Список Want порожній на цьому акаунті');

    const gameId = await wantCard.getAttribute('data-game-id');
    const title = (await wantCard.getByRole('link').filter({ hasText: /./ }).first().textContent())?.trim();

    // Реальний Want-айтем міг бути випущений давно (як "Elden Ring" — реліз 28
    // серпня) і вже випасти з дефолтного вікна дат /games — звичайний
    // games.goto() + cardById тоді просто не знайшов би цю картку. Виправляв це
    // на живу руку й сам двічі спіткнувся: (1) games.goto() без розширення
    // взагалі не бачить давню гру; (2) games.goto('release_from=2000-01-01') БЕЗ
    // пошукового `q=` рендерить ~2000 карток одразу — потрібної серед першої
    // партії DOM може не бути. Єдиний перевірений спосіб — findCardByTitle
    // (пошук за точною назвою + розширений діапазон РАЗОМ).

    try {
      await cabinet.removeFromLibrary(title);
      await expect(cabinet.gameCardById(gameId)).toHaveCount(0);

      const cardAfterRemove = await games.findCardByTitle(title);
      await expect(games.statusButton(cardAfterRemove, 'wishlist')).toHaveAttribute('aria-pressed', 'false');
    } finally {
      // РЕАЛЬНИЙ айтем з вішліста акаунта — повертаємо назад незалежно від того,
      // на якому кроці впав тест вище. Не через cleanupLibraryItem (та функція
      // видаляє, а не додає) — тут навпаки, повертаємо статус через /games.
      const card = await games.findCardByTitle(title);
      const btn = games.statusButton(card, 'wishlist');
      if ((await btn.getAttribute('aria-pressed')) !== 'true') {
        await btn.click();
      }
    }

    await cabinet.goto();
    await cabinet.gamesSections.first().waitFor({ state: 'attached' });
    await expect(cabinet.gameSection('Want').getByRole('link', { name: title, exact: true })).toBeVisible();
  });

  test('перемикач статусу на /games є взаємовиключним — новий статус деактивує попередній', async (
    { page },
    testInfo
  ) => {
    test.skip(testInfo.project.name !== 'chromium', 'Мутує спільний акаунт — досить одного project.');
    const games = new GamesPage(page);
    const cabinet = new CabinetPage(page);
    await games.goto();

    const pick = await games.firstUntouchedWishlistCard();
    test.skip((await pick.count()) === 0, 'Немає жодної непозначеної гри на поточній видачі /games');
    const gameId = await pick.getAttribute('data-game-id');
    const card = games.cardById(gameId);

    try {
      await games.statusButton(card, 'wishlist').click();
      await expect(games.statusButton(card, 'wishlist')).toHaveAttribute('aria-pressed', 'true');

      await games.statusButton(card, 'owned').click();
      await expect(games.statusButton(card, 'owned')).toHaveAttribute('aria-pressed', 'true');
      // Перемикання на "owned" деактивує "wishlist" — статус не додається, а замінюється.
      await expect(games.statusButton(card, 'wishlist')).toHaveAttribute('aria-pressed', 'false');

      // Клік по вже активному статусу знімає його повністю (а не перемикає на щось інше).
      await games.statusButton(card, 'owned').click();
      await expect(games.statusButton(card, 'owned')).toHaveAttribute('aria-pressed', 'false');
    } finally {
      await cleanupLibraryItem(page, cabinet, gameId);
    }
  });

  test('перемикання статусу на /games переносить гру між секціями кабінету', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Мутує спільний акаунт — досить одного project.');
    const games = new GamesPage(page);
    const cabinet = new CabinetPage(page);
    await games.goto();

    const pick = await games.firstUntouchedWishlistCard();
    test.skip((await pick.count()) === 0, 'Немає жодної непозначеної гри на поточній видачі /games');
    const gameId = await pick.getAttribute('data-game-id');
    const title = (await pick.locator('.und-game-card__title').textContent())?.trim();
    const card = games.cardById(gameId);

    try {
      await games.statusButton(card, 'wishlist').click();
      await cabinet.goto();
      await cabinet.gamesSections.first().waitFor({ state: 'attached' });
      await expect(cabinet.gameSection('Want').getByRole('link', { name: title, exact: true })).toBeVisible();

      await games.goto();
      await games.statusButton(games.cardById(gameId), 'playing').click();

      await cabinet.goto();
      await cabinet.gamesSections.first().waitFor({ state: 'attached' });
      await expect(cabinet.gameSection('Playing').getByRole('link', { name: title, exact: true })).toBeVisible();
      await expect(cabinet.gameSection('Want').getByRole('link', { name: title, exact: true })).toHaveCount(0);
    } finally {
      await cleanupLibraryItem(page, cabinet, gameId);
    }
  });

  test('dropdown у кабінеті проводить гру через усі 5 категорій, включно з Dropped', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Мутує спільний акаунт — досить одного project.');
    const games = new GamesPage(page);
    const cabinet = new CabinetPage(page);
    await games.goto();

    const pick = await games.firstUntouchedWishlistCard();
    test.skip((await pick.count()) === 0, 'Немає жодної непозначеної гри на поточній видачі /games');
    const gameId = await pick.getAttribute('data-game-id');
    const title = (await pick.locator('.und-game-card__title').textContent())?.trim();
    const card = games.cardById(gameId);

    try {
      await games.statusButton(card, 'wishlist').click();
      await cabinet.goto();
      await cabinet.gamesSections.first().waitFor({ state: 'attached' });

      const select = cabinet.gameCardById(gameId).locator('.und-cab-game__status');

      // "Dropped" недосяжний з /games (там лише 4 кнопки — wishlist/owned/playing/
      // completed), єдиний шлях до нього — цей select у кабінеті.
      const order = /** @type {const} */ (['Want', 'Own', 'Playing', 'Beaten', 'Dropped']);
      for (const status of order) {
        await select.selectOption(STATUS_VALUES[status]);
        await expect(cabinet.gameSection(status).getByRole('link', { name: title, exact: true })).toBeVisible();
        for (const other of order) {
          if (other !== status) {
            await expect(cabinet.gameSection(other).getByRole('link', { name: title, exact: true })).toHaveCount(0);
          }
        }
      }
    } finally {
      await cleanupLibraryItem(page, cabinet, gameId);
    }
  });
});
