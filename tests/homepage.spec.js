const { test, expect } = require('./fixtures');
const { HomePage } = require('../src/pages/HomePage');

// Тести самого банера згоди живуть у consent.spec.js — там потрібен чистий контекст.
// Тут фікстура вже несе cookie згоди, тож банер не зʼявляється й чекати його не треба.

test.describe('Homepage', () => {
  /** @type {HomePage} */
  let home;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.goto();
  });

  test('завантажується з коректним title і h1', async ({ page }) => {
    await expect(page).toHaveTitle('Ukraine Nintendo Daily');
    await expect(home.mainHeading).toBeVisible();
  });

  test('логотип веде на головну', async ({ page }) => {
    await home.logoLink.click();
    await expect(page).toHaveURL('https://und.com.ua/');
  });

  test('пагінація переходить на наступну сторінку списку новин', async ({ page }) => {
    await home.goToNextPage();
    await expect(page).toHaveURL(/\?page=2/);
    await expect(home.articleCards.first()).toBeVisible();
  });
});

// Шапка з горизонтальною навігацією та полем пошуку існує лише в десктопному макеті —
// мобільний еквівалент (бургер-меню) покриває responsive.spec.js.
test.describe('Homepage — десктопна шапка', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'Лише десктопний макет');

  /** @type {HomePage} */
  let home;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.goto();
  });

  const navLinks = [
    { locator: 'navNewsLink', path: '/' },
    { locator: 'navEditorialLink', path: '/editorial' },
    { locator: 'navTournamentsLink', path: '/tournaments' },
    { locator: 'navCalendarLink', path: '/games' },
    { locator: 'navTvLink', path: '/news/category/telebachennya' },
  ];
  for (const { locator, path } of navLinks) {
    test(`навігація "${locator}" веде на ${path}`, async ({ page }) => {
      await home[locator].click();
      await expect(page).toHaveURL(`https://und.com.ua${path}`);
    });
  }

  test('пошук веде на сторінку результатів', async ({ page }) => {
    await home.search('Mario');
    await expect(page).toHaveURL(/\/news\/search\?q=Mario/);
    await expect(page.getByRole('heading', { level: 2, name: 'Результати пошуку' })).toBeVisible();
  });
});
