const { test, expect } = require('./fixtures');
const { HomePage } = require('../src/pages/HomePage');
const { SearchResultsPage } = require('../src/pages/SearchResultsPage');

test.describe('Пошук', () => {
  // Мобільний макет не має поля пошуку взагалі — ані в шапці, ані в бургер-меню.
  test.skip(({ isMobile }) => Boolean(isMobile), 'Пошук відсутній у мобільному макеті');

  /** @type {HomePage} */
  let home;
  /** @type {SearchResultsPage} */
  let results;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    results = new SearchResultsPage(page);
    await home.goto();
  });

  test('знаходить результати і повторює запит на сторінці', async ({ page }) => {
    await home.search('Mario');

    await expect(page).toHaveURL(/\/news\/search\?q=Mario/);
    await expect(results.resultsHeading).toBeVisible();
    await expect(results.queryEcho('Mario')).toBeVisible();
    expect(await results.articleCards.count()).toBeGreaterThan(0);
  });

  test('зберігає запит у полі пошуку після сабміту', async () => {
    await home.search('Mario');
    await expect(results.searchInput).toHaveValue('Mario');
  });

  test('показує порожній стан, коли нічого не знайдено', async ({ page }) => {
    const query = 'zzzqqqxyz123';
    await home.search(query);

    await expect(results.emptyState(query)).toBeVisible();
    await expect(results.articleCards).toHaveCount(0);
    // Порожній результат — не помилка: сторінка лишається робочою.
    await expect(page).toHaveTitle(/Пошук/);
  });

  test('коректно обробляє кириличний запит', async ({ page }) => {
    await home.search('Покемон');

    await expect(page).toHaveURL(/\/news\/search\?q=/);
    await expect(results.queryEcho('Покемон')).toBeVisible();
    await expect(results.searchInput).toHaveValue('Покемон');
  });

  test('пагінація результатів зберігає запит у URL', async ({ page }) => {
    await results.goto('Mario');
    await results.goToNextPage();

    await expect(page).toHaveURL(/\/news\/search\?page=2&q=Mario/);
    await expect(results.queryEcho('Mario')).toBeVisible();
    expect(await results.articleCards.count()).toBeGreaterThan(0);
  });

  test('результати містять окрему секцію ігор', async () => {
    await results.goto('Mario');
    await expect(results.gamesSectionHeading).toBeVisible();
  });
});
