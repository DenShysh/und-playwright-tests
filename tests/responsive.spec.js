const { test, expect } = require('./fixtures');
const { HomePage } = require('../src/pages/HomePage');

/**
 * Мобільний макет — не «стиснутий десктоп»: бургер відкриває окрему панель із власним
 * набором посилань (додає "Змагання"/"Рейтинг SSBU", інлайнить мовні лінки) і взагалі
 * не містить поля пошуку. Тому тут перевіряється саме мобільна інформаційна структура.
 */
test.describe('Мобільний макет', () => {
  test.skip(({ isMobile }) => !isMobile, 'Тільки для мобільних проєктів');

  /** @type {HomePage} */
  let home;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.goto();
  });

  test('показує бургер замість десктопної навігації', async () => {
    await expect(home.hamburgerButton).toBeVisible();
    await expect(home.navNewsLink).toBeHidden();
    await expect(home.searchInput).toBeHidden();
  });

  test('бургер відкриває меню з основними розділами', async () => {
    await expect(home.mobileMenu).toBeHidden();
    await home.hamburgerButton.click();

    await expect(home.mobileMenu).toBeVisible();
    for (const name of ['Новини', 'Авторські огляди', 'Турніри', 'Календар', 'UND TV']) {
      await expect(home.mobileMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('мобільне меню містить перемикач мови та вхід', async () => {
    await home.hamburgerButton.click();

    await expect(home.mobileMenuLangUk).toBeVisible();
    await expect(home.mobileMenuLangEn).toHaveAttribute('href', /lang=en/);
    await expect(home.mobileMenu.getByRole('link', { name: 'Увійти' })).toBeVisible();
  });

  test('перехід із мобільного меню працює', async ({ page }) => {
    await home.hamburgerButton.click();
    await home.mobileMenu.getByRole('link', { name: 'Календар', exact: true }).click();

    await expect(page).toHaveURL('https://und.com.ua/games');
  });

  test('контент лишається читабельним без горизонтального скролу', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    // Невеликий допуск на субпіксельне округлення.
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
