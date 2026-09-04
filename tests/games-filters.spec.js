const { test, expect } = require('./fixtures');
const { GamesPage } = require('../src/pages/GamesPage');

test.describe('Фільтри календаря — граничні випадки', () => {
  /** @type {GamesPage} */
  let games;

  test.beforeEach(async ({ page }) => {
    games = new GamesPage(page);
  });

  test('комбінація фільтрів зберігається в URL і у формі', async ({ page }) => {
    await games.goto('platform=switch-2&sort=name');

    await expect(page).toHaveURL(/[?&]platform=switch-2/);
    await expect(page).toHaveURL(/[?&]sort=name/);

    // Обидва контроли лишаються обраними — форма відображає стан із URL,
    // а не скидається до дефолтів при застосуванні другого фільтра.
    await expect(games.platformSelect).toHaveValue('switch-2');
    await expect(games.sortSelect).toHaveValue('name');
  });

  test('фільтр за платформою звужує вибірку', async () => {
    await games.goto();
    const total = await games.gameCards.count();

    await games.goto('platform=switch-2');
    const filtered = await games.gameCards.count();

    expect(filtered).toBeGreaterThan(0);
    expect(filtered, 'відфільтрованих має бути менше за всіх').toBeLessThan(total);
  });

  test('невалідне значення фільтра ігнорується, а не ламає сторінку', async ({ page }) => {
    await games.goto();
    const total = await games.gameCards.count();

    const response = await page.goto('/games?platform=neexistuye-taka', {
      waitUntil: 'domcontentloaded',
    });

    // Сайт відкидає невідоме значення й показує повну вибірку замість 404 чи помилки.
    // Фіксуємо цю поведінку, щоб помітити, якщо вона колись зміниться.
    expect(response?.status()).toBe(200);
    await expect(games.platformSelect).toHaveValue('');
    expect(await games.gameCards.count()).toBe(total);
  });

  test('комбінація з порожнім результатом показує порожній стан і зберігає обидва фільтри', async () => {
    await games.goto('q=zzzqqqxyz123&platform=switch-2');

    await expect(games.emptyState).toBeVisible();
    await expect(games.gameCards).toHaveCount(0);

    await games.openFilterPanel();
    await expect(games.nameSearchInput).toHaveValue('zzzqqqxyz123');
    await expect(games.platformSelect).toHaveValue('switch-2');
  });

  test('"Скинути" повертає повну вибірку і чистий URL', async ({ page }) => {
    await games.goto();
    const total = await games.gameCards.count();

    await games.goto('platform=switch-2&sort=name');
    expect(await games.gameCards.count()).toBeLessThan(total);

    await games.openFilterPanel();
    await games.resetFilters();

    await expect(page).toHaveURL('https://und.com.ua/games');
    await expect(games.platformSelect).toHaveValue('');
    expect(await games.gameCards.count()).toBe(total);
  });

  test('сортування за назвою змінює вигляд і прибирає групування за місяцями', async () => {
    await games.goto('platform=switch-2');
    const byRelease = await games.gameTitles.allTextContents();
    const monthsByRelease = await games.monthHeadings.count();

    await games.goto('platform=switch-2&sort=name');
    const byName = await games.gameTitles.allTextContents();

    expect(byRelease.length).toBeGreaterThan(0);
    expect(byName).not.toEqual(byRelease);

    // За замовчуванням картки згруповані за місяцями релізу; сортування за назвою
    // дає єдиний пласкій список.
    expect(monthsByRelease).toBeGreaterThan(0);
    await expect(games.monthHeadings).toHaveCount(0);

    // Режими сортування повертають РІЗНІ набори, а не лише різний порядок: календарний
    // вигляд опускає релізи, які не лягають у помісячне групування, тож "за назвою"
    // показує їх БІЛЬШЕ (заміряно: 135 проти 150 на switch-2, однаково на обох макетах).
    // Точних чисел не фіксуємо — каталог поповнюється.
    expect(byName.length).toBeGreaterThanOrEqual(byRelease.length);

    // Порядок усередині не асертимо: сервер і JS по-різному впорядковують
    // типографські апострофи (' проти ’).
  });
});

test.describe('Модалка «Розширені фільтри»', () => {
  /** @type {GamesPage} */
  let games;

  test.beforeEach(async ({ page }) => {
    games = new GamesPage(page);
    await games.goto();
  });

  test('відкривається і закривається', async () => {
    await expect(games.advancedFiltersModal).toBeHidden();

    await games.openAdvancedFilters();
    await expect(games.advancedFiltersModal).toBeVisible();

    await games.advancedFiltersClose.click();
    await expect(games.advancedFiltersModal).toBeHidden();
  });

  test('містить власний набір фільтрів, відсутній у компактному рядку', async () => {
    await games.openAdvancedFilters();

    // Це НЕ ті самі контроли, що platform/sort: модалка додає окрему групу.
    for (const name of ['genre', 'engine', 'keyword', 'franchise', 'external_source']) {
      await expect(
        games.advancedFiltersModal.locator(`select[name="${name}"]`),
        `select[name="${name}"] у модалці`
      ).toBeAttached();
    }
  });

  test('нативні select приховані на користь кастомних тригерів', async () => {
    await games.openAdvancedFilters();

    // Сайт лишає нативний <select> у DOM лише для сабміту форми, показуючи замість
    // нього кастомний віджет — тому тут `toBeAttached`, а не `toBeVisible`.
    await expect(games.advancedFiltersModal.locator('select[name="genre"]')).toBeAttached();
    await expect(games.advancedFiltersModal.locator('select[name="genre"]')).toBeHidden();

    expect(await games.advancedCustomTriggers.count()).toBeGreaterThan(0);
    await expect(games.advancedCustomTriggers.first()).toBeVisible();
  });
});
