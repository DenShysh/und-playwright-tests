// @ts-check

/**
 * Maps each status section's display label to the `<select>` option value its
 * game cards render (confirmed via a live `<option>` dump, not guessed from the
 * label text — e.g. "Beaten" → "completed", not "beaten").
 */
const STATUS_VALUES = {
  Want: 'wishlist',
  Playing: 'playing',
  Own: 'owned',
  Beaten: 'completed',
  Dropped: 'dropped',
};

/**
 * Page Object Model for the UND personal cabinet (/cabinet), built from a live
 * authenticated browser_snapshot of https://und.com.ua/cabinet?tab=games.
 *
 * AUTH REQUIRED: this page redirects to /web/login for anonymous visitors. Tests
 * must use the `test` exported from tests/authed.fixtures.js, which adds a real
 * `session_id` cookie from the SESSION_ID env var.
 *
 * LOCALE: unlike anonymous front-end pages (uk-UA per playwright.config.js), this
 * account renders in English — Odoo serves authenticated portal pages in the
 * user's stored language preference, not the request's Accept-Language. Expect
 * /en/cabinet URLs and English copy regardless of the configured browser locale.
 *
 * Tabs (Views/Comments/Replies/Players/Games) are query params on this same URL,
 * not separate pages — only the Games tab (the priority area / wishlist) has been
 * inspected here; the other tabs' inner content is unexplored.
 */
class CabinetPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    this.userName = page.getByRole('heading', { level: 1 });
    this.userEmail = page.locator('.und-cabinet-user-email');
    this.changeAvatarButton = page.getByRole('button', { name: 'Change avatar' });

    // Fixed, small tab strip — one locator per tab rather than a positional index.
    this.tabs = page.locator('.und-cabinet-tabs');
    this.viewsTab = this.tabs.getByRole('link', { name: 'Views' });
    this.commentsTab = this.tabs.getByRole('link', { name: 'Comments' });
    this.repliesTab = this.tabs.getByRole('link', { name: 'Replies' });
    this.playersTab = this.tabs.getByRole('link', { name: 'Players' });
    this.gamesTab = this.tabs.getByRole('link', { name: 'Games' });

    // Games tab (wishlist) — priority area.
    this.notificationsSection = page.locator('.und-cab-notifs');
    // `.und-cabinet-games` wraps every status section (Want/Playing/Own/Beaten/Dropped),
    // PLUS the notifications block — it carries `.und-cab-section` too, so it must be
    // excluded explicitly rather than relying on count/position.
    // `.und-cab-section` is one section, carrying an `--empty` modifier when it has no games.
    this.gamesSections = page.locator('.und-cabinet-games .und-cab-section:not(.und-cab-notifs)');
    this.emptyGamesSections = page.locator('.und-cabinet-games .und-cab-section--empty');
    this.gameCards = page.locator('.und-cab-game');
  }

  /** Games tab is the priority tab, so goto() lands there directly. */
  async goto() {
    await this.page.goto('/cabinet?tab=games', { waitUntil: 'domcontentloaded' });
  }

  /** @param {'views' | 'comments' | 'replies' | 'players' | 'games'} tab */
  async gotoTab(tab) {
    await this.page.goto(`/cabinet?tab=${tab}`, { waitUntil: 'domcontentloaded' });
  }

  /**
   * A status section by its heading word (e.g. "Want", "Own"). Each heading's
   * accessible name has a leading icon glyph before the word (" Want 4"), so this
   * intentionally has no `^` anchor — it matches the status word anywhere in the name.
   * @param {'Want' | 'Playing' | 'Own' | 'Beaten' | 'Dropped'} status
   */
  gameSection(status) {
    return this.gamesSections.filter({
      has: this.page.getByRole('heading', { name: new RegExp(status) }),
    });
  }

  /**
   * A single wishlist game card by its title link.
   * @param {string} title
   */
  gameCard(title) {
    return this.gameCards.filter({ has: this.page.getByRole('link', { name: title, exact: true }) });
  }

  /**
   * Stable locator for a card by its `data-game-id` — matches GamesPage.cardById,
   * so a card can be tracked by the same identifier across both pages regardless
   * of which status section it currently sits in. NOT `this.gameCards.locator(...)`:
   * `data-game-id` sits on the `.und-cab-game` element itself, and chaining
   * `.locator()` off a Locator searches its DESCENDANTS, not the element itself.
   * @param {string} gameId
   */
  gameCardById(gameId) {
    return this.page.locator(`.und-cab-game[data-game-id="${gameId}"]`);
  }

  /**
   * The status dropdown (Want/Own/Playing/Beaten/Dropped) for one game card.
   * MUTATES real account data — do not call from smoke/MVP tests.
   * @param {string} title
   */
  gameStatusSelect(title) {
    return this.gameCard(title).locator('.und-cab-game__status');
  }

  /**
   * The "Remove from library" button for one game card.
   * MUTATES real account data — do not call from smoke/MVP tests.
   * @param {string} title
   */
  removeFromLibraryButton(title) {
    return this.gameCard(title).locator('.und-cab-game__remove');
  }

  /**
   * Clicks "Remove from library" and confirms the native `confirm()` dialog
   * ("Remove this game from your library?") it triggers — without a handler
   * registered first, the click hangs waiting on that unhandled dialog.
   * MUTATES real account data — do not call from smoke/MVP tests.
   * @param {string} title
   */
  async removeFromLibrary(title) {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.removeFromLibraryButton(title).click();
  }

  /**
   * Clicks a wishlist game card's title link, navigating to its /games/<slug> page.
   * @param {string} title
   */
  async openGame(title) {
    await this.gameCard(title).getByRole('link', { name: title, exact: true }).click();
  }

  /**
   * Every game-card and notification link href on the current tab, deduplicated —
   * for a link-integrity check via the `request` fixture. Read from the DOM rather
   * than getByRole so hidden/decorative anchors (e.g. the card's image-wrapper link,
   * which has no accessible name) are included too.
   */
  async collectGameHrefs() {
    // evaluateAll doesn't auto-retry like `expect(locator)` does, so wait for the
    // final rendered page (post locale-redirect) before reading — under parallel
    // load, an immediate read can otherwise catch an intermediate/empty state.
    await this.gamesSections.first().waitFor({ state: 'attached' });
    const cardHrefs = await this.gameCards
      .locator('a')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    const notifHrefs = await this.notificationsSection
      .locator('a')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    return [...new Set([...cardHrefs, ...notifHrefs])].filter(Boolean);
  }
}

module.exports = { CabinetPage, STATUS_VALUES };
