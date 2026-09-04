const { test, expect } = require('./fixtures');
const { HomePage } = require('../src/pages/HomePage');
const { ArticlePage } = require('../src/pages/ArticlePage');

test.describe('Стаття — наскрізна навігація', () => {
  /** @type {HomePage} */
  let home;
  /** @type {ArticlePage} */
  let article;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    article = new ArticlePage(page);
    await home.goto();
  });

  test('картка новини відкриває статтю з тим самим заголовком', async ({ page }) => {
    const firstCard = home.articleCards.first();
    const cardLink = firstCard.getByRole('link').first();

    const href = await cardLink.getAttribute('href');
    const cardTitle = (await firstCard.getByRole('heading', { level: 3 }).textContent()) ?? '';

    await cardLink.click();

    // URL збігається з href картки, а h1 статті — з її заголовком у списку.
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(article.title).toHaveText(cardTitle.trim());
  });

  test('сторінка статті має повний набір SEO-метаданих', async ({ page }) => {
    await home.articleCards.first().getByRole('link').first().click();

    await expect(article.ogContent('og:title')).toHaveAttribute('content', /.+/);
    await expect(article.ogContent('og:image')).toHaveAttribute('content', /^https?:\/\//);
    await expect(article.metaContent('description')).toHaveAttribute('content', /.+/);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', page.url());
  });

  test('стаття містить хлібні крихти, теги та блок коментарів', async () => {
    await home.articleCards.first().getByRole('link').first().click();

    await expect(article.breadcrumbs.getByRole('link', { name: 'Новини' })).toBeVisible();
    expect(await article.tagLinks.count()).toBeGreaterThan(0);
    await expect(article.commentsHeading).toBeVisible();
  });

  test('тег зі статті веде на пошук за цим тегом', async ({ page }) => {
    await home.articleCards.first().getByRole('link').first().click();

    const firstTag = article.tagLinks.first();
    await firstTag.click();

    await expect(page).toHaveURL(/\/news\/search\?tag=\d+/);
  });
});
