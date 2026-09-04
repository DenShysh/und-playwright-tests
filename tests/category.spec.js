const { test, expect } = require('./fixtures');
const { HomePage } = require('../src/pages/HomePage');
const { CategoryPage } = require('../src/pages/CategoryPage');

const CATEGORY = { slug: 'pokmon', name: 'Pokémon' };

// Категорії, чия сторінка структурно ідентична, тож покриваються тим самим POM.
// Назва в UI не є перекладом слага: слаг — транслітерація з української
// ("telebachennya"), а видима назва англійська ("Television").
const CATEGORIES = [
  CATEGORY,
  { slug: 'telebachennya', name: 'Television' },
];

test.describe('Категорії', () => {
  /** @type {CategoryPage} */
  let category;

  test.beforeEach(async ({ page }) => {
    const home = new HomePage(page);
    category = new CategoryPage(page);
    await home.goto();
  });

  test('фільтр із головної веде на сторінку категорії', async ({ page }) => {
    const home = new HomePage(page);
    await home.filterByCategory(CATEGORY.name);

    await expect(page).toHaveURL(new RegExp(`/news/category/${CATEGORY.slug}$`));
    await expect(category.heading(CATEGORY.name)).toBeVisible();
  });

  for (const { slug, name } of CATEGORIES) {
    test(`усі статті категорії "${name}" належать саме їй`, async () => {
      await category.goto(slug);

      const cardCount = await category.articleCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Ключова перевірка: фільтр справді фільтрує, а не лише змінює URL.
      const badges = await category.categoryBadges.allTextContents();
      expect(badges).toHaveLength(cardCount);
      for (const badge of badges) {
        expect(badge.trim()).toBe(name);
      }
    });

    test(`сторінка категорії "${name}" має власний заголовок і title`, async ({ page }) => {
      await category.goto(slug);

      await expect(page).toHaveTitle(new RegExp(name));
      await expect(category.heading(name)).toBeVisible();
    });
  }

  test('"Всі" скидає фільтр назад на головну', async ({ page }) => {
    await category.goto(CATEGORY.slug);

    const home = new HomePage(page);
    await home.filterByCategory('Всі');

    await expect(page).toHaveURL('https://und.com.ua/');
  });
});
