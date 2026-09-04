// @ts-check

/**
 * Page Object Model for a UND news category listing (/news/category/<slug>).
 * Built from a live browser_snapshot of https://und.com.ua/news/category/pokmon
 */
class CategoryPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    this.articleCards = page.getByRole('article');
    this.nextPageLink = page.getByRole('link', { name: 'Наступна сторінка' });

    // Each card carries its category as a badge; the category page renders the
    // same label as an h2, so the two can be cross-checked against each other.
    // Only the --white variant is the category badge: a card may additionally carry
    // `--hot` ("Гаряче"), which would otherwise inflate the count past the card total.
    this.categoryBadges = page.locator('article .und-badge--white');
  }

  /** @param {string} slug */
  async goto(slug) {
    await this.page.goto(`/news/category/${slug}`, { waitUntil: 'domcontentloaded' });
  }

  /** @param {string} name */
  heading(name) {
    return this.page.getByRole('heading', { name, level: 2 });
  }
}

module.exports = { CategoryPage };
