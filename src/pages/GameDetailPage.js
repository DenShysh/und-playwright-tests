// @ts-check

/**
 * Page Object Model for an individual game page (/games/<slug>), e.g.
 * https://und.com.ua/games/elden-ring. Built from a live browser_snapshot.
 *
 * Minimal on purpose — this exists only to verify cross-page navigation from
 * CabinetPage's wishlist cards (card title === this page's h1), not to cover the
 * page's own content.
 */
class GameDetailPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.mainHeading = page.getByRole('heading', { level: 1 });
  }
}

module.exports = { GameDetailPage };
