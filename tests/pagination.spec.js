const { test, expect } = require('./fixtures');
const { HomePage } = require('../src/pages/HomePage');

/** Заголовки карток на поточній сторінці — для порівняння наборів між сторінками. */
async function cardTitles(home) {
  return home.articleCards.getByRole('heading', { level: 3 }).allTextContents();
}

test.describe('Пагінація', () => {
  /** @type {HomePage} */
  let home;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.goto();
  });

  test('сторінка 2 містить інші статті, ніж сторінка 1', async ({ page }) => {
    const firstPage = await cardTitles(home);
    expect(firstPage.length).toBeGreaterThan(0);

    await home.goToNextPage();
    await expect(page).toHaveURL(/\?page=2/);

    const secondPage = await cardTitles(home);
    expect(secondPage.length).toBeGreaterThan(0);
    expect(secondPage).not.toEqual(firstPage);
  });

  test('прямий перехід за URL на сторінку 2 працює', async ({ page }) => {
    await page.goto('/?page=2', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\?page=2/);
    expect(await home.articleCards.count()).toBeGreaterThan(0);
  });

  test('сторінка поза діапазоном не ламає сайт', async ({ page }) => {
    const response = await page.goto('/?page=99999', { waitUntil: 'domcontentloaded' });

    // Сайт віддає 200 із порожнім списком замість 404 — фіксуємо цю поведінку,
    // щоб помітити, якщо вона колись зміниться.
    expect(response?.status()).toBe(200);
    await expect(home.articleCards).toHaveCount(0);
    await expect(home.mainHeading).toBeVisible();
  });
});
