const { test, expect } = require('./fixtures');
const { EditorialPage } = require('../src/pages/EditorialPage');

test.describe('Авторські огляди', () => {
  /** @type {EditorialPage} */
  let editorial;

  test.beforeEach(async ({ page }) => {
    editorial = new EditorialPage(page);
    await editorial.goto();
  });

  test('завантажується з коректним title і заголовком розділу', async ({ page }) => {
    await expect(page).toHaveTitle(/Editorial Reviews Page/);
    await expect(editorial.sectionHeading).toBeVisible();
    await expect(editorial.heroHeading).toBeVisible();
  });

  test('показує список оглядів', async () => {
    expect(await editorial.articleCards.count()).toBeGreaterThan(0);
  });

  test('усі картки належать розділу авторських оглядів', async () => {
    const badges = await editorial.cardBadges.allTextContents();
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge.trim()).toBe('Авторські Огляди');
    }
  });

  test('картка відкриває статтю', async ({ page }) => {
    const firstCard = editorial.articleCards.first();
    const link = firstCard.locator('a').first();
    const href = await link.getAttribute('href');

    await link.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
