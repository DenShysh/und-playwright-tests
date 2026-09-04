// @ts-check

/**
 * Page Object Model for the UND Super Smash Bros. Ultimate player standings
 * (/tournaments/ratings-ssbu).
 * Built from a live browser_snapshot of https://und.com.ua/tournaments/ratings-ssbu
 *
 * The page is a single standings table whose columns are internally consistent
 * (W + L = matches, win% = W / matches, ranks sequential, rating descending),
 * which makes it a good target for data-integrity assertions.
 */
class RatingsSsbuPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    this.mainHeading = page.getByRole('heading', { level: 1 });
    this.table = page.locator('table.und-standings-table');
    this.rows = this.table.locator('tbody tr');
    this.columnHeaders = this.table.locator('th');
  }

  async goto() {
    await this.page.goto('/tournaments/ratings-ssbu', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Parses the standings table into typed rows so tests can assert on the data
   * rather than on rendered strings.
   * @returns {Promise<Array<{rank: number, player: string, rating: number, wins: number,
   *   losses: number, winPercent: number, matches: number, tournaments: number, elo: number}>>}
   */
  async readRows() {
    return this.rows.evaluateAll((trs) =>
      trs.map((tr) => {
        const cells = [...tr.children].map((td) => (td.textContent ?? '').trim());
        return {
          rank: Number(cells[0]),
          player: cells[1],
          rating: parseFloat(cells[2]),
          wins: Number(cells[3]),
          losses: Number(cells[4]),
          winPercent: parseInt(cells[5], 10),
          matches: Number(cells[6]),
          tournaments: Number(cells[7]),
          elo: Number(cells[8]),
        };
      })
    );
  }
}

module.exports = { RatingsSsbuPage };
