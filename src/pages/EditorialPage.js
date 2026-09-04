// @ts-check

/**
 * Page Object Model for the UND editorial reviews listing (/editorial).
 * Built from a live browser_snapshot of https://und.com.ua/editorial
 *
 * Layout note: unlike the homepage this page has NO category-tab nav and no
 * pagination — it renders a hero article plus a flat list of review cards.
 */
class EditorialPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    this.sectionHeading = page.getByRole('heading', { name: 'Авторські огляди', level: 2 });

    // The h1 is the hero article's headline, so its text changes with content;
    // only the role/level selector is stable.
    this.heroHeading = page.getByRole('heading', { level: 1 });
    this.heroLink = page.locator('main a').first();

    this.articleCards = page.locator('article.und-card');
    this.cardTitles = page.locator('article.und-card .und-card__title');
    // Only the --white variant is the category badge. A card may carry a second
    // badge (`--hot` / "Гаряче"), so an unqualified `.und-badge` would return more
    // elements than there are cards.
    this.cardBadges = page.locator('article.und-card .und-badge--white');
  }

  async goto() {
    await this.page.goto('/editorial', { waitUntil: 'domcontentloaded' });
  }

  /** @param {string} title */
  async openCardByTitle(title) {
    await this.articleCards.filter({ hasText: title }).locator('a').first().click();
  }
}

module.exports = { EditorialPage };
