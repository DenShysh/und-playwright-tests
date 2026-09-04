// @ts-check

/**
 * Page Object Model for the UND tournaments listing (/tournaments).
 * Built from a live browser_snapshot of https://und.com.ua/tournaments
 *
 * The page carries two independent server-side filters:
 *  - status tabs      → /tournaments and /tournaments?status=finished
 *  - a game <select>  → /tournaments?game=<name>
 * Both reload the page and update the per-tab counters, so they can be asserted
 * against the rendered card set.
 */
class TournamentsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Static heading — unlike the news pages this h1 is a real page title, not content.
    this.mainHeading = page.getByRole('heading', { name: 'Турніри та змагання', level: 1 });
    this.eyebrow = page.getByText('UND Кіберспорт');

    // Class-anchored: several tab-like widgets exist site-wide, and the count of
    // nav landmarks differs between layouts, so a positional index is not stable.
    this.filterTabs = page.locator('.und-tournament-tabs');
    this.allTournamentsTab = this.filterTabs.getByRole('link', { name: /Усі турніри/ });
    this.finishedTab = this.filterTabs.getByRole('link', { name: /Завершені/ });

    this.gameFilter = page.locator('select#und-game-filter');

    this.tournamentCards = page.locator('article.und-tcard');
    this.cardGameLabels = page.locator('article.und-tcard .und-tcard__game-label');
    this.cardTitles = page.locator('article.und-tcard .und-tcard__title');

    // Sidebar leaderboard widget. It renders the same standings as
    // /tournaments/ratings-ssbu, truncated to the top rows — which makes the two
    // pages cross-checkable against each other.
    this.leaderboardHeading = page.getByRole('heading', { name: /Загальний рейтинг/, level: 3 });
    this.leaderboardRows = page.locator('.und-leaderboard__rank');
    this.leaderboard = page.locator('.und-leaderboard');
    this.fullRatingLink = page.getByRole('link', { name: 'Повний рейтинг' });
  }

  async goto() {
    await this.page.goto('/tournaments', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Selecting a game navigates to /tournaments?game=<name>. The wait is required:
   * without it the caller can read tab counters off the pre-navigation page and
   * compare them against the already-updated card list.
   * @param {string} game
   */
  async filterByGame(game) {
    await this.gameFilter.selectOption(game);
    await this.page.waitForURL(/[?&]game=/);
  }

  async showFinished() {
    await this.finishedTab.click();
  }

  async openFullRating() {
    await this.fullRatingLink.click();
  }

  /**
   * Parses the sidebar leaderboard into typed rows, so it can be compared against the
   * full standings table on /tournaments/ratings-ssbu.
   * @returns {Promise<Array<{rank: number, player: string, rating: number}>>}
   */
  async readLeaderboard() {
    return this.leaderboard.locator('.und-leaderboard__row').evaluateAll((rows) =>
      rows.map((row) => ({
        rank: Number(row.querySelector('.und-leaderboard__rank')?.textContent?.trim()),
        player: row.querySelector('.und-leaderboard__name')?.textContent?.trim() ?? '',
        rating: parseFloat(row.querySelector('.und-leaderboard__score')?.textContent?.trim() ?? ''),
      }))
    );
  }

  /**
   * Reads the counter badge rendered inside a status tab (e.g. "Усі турніри 8" → 8).
   * @param {'all' | 'finished'} tab
   * @returns {Promise<number>}
   */
  async tabCount(tab) {
    const locator = tab === 'all' ? this.allTournamentsTab : this.finishedTab;
    const text = (await locator.textContent()) ?? '';
    const match = text.match(/(\d+)\s*$/);
    return match ? Number(match[1]) : NaN;
  }
}

module.exports = { TournamentsPage };
