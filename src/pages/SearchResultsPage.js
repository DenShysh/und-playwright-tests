// @ts-check

/**
 * Page Object Model for the UND search results page (/news/search?q=...).
 * Built from a live browser_snapshot of https://und.com.ua/news/search?q=Mario
 */
class SearchResultsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Header search field keeps the submitted query, so it doubles as a result assertion.
    this.searchInput = page.getByPlaceholder('Пошук...');
    this.searchButton = page.getByRole('button', { name: 'Пошук' });

    this.resultsHeading = page.getByRole('heading', { name: 'Результати пошуку', level: 2 });
    this.gamesSectionHeading = page.getByRole('heading', { name: 'Ігри', level: 3 });
    this.articleCards = page.getByRole('article');
    this.nextPageLink = page.getByRole('link', { name: 'Наступна сторінка' });
  }

  /** @param {string} query */
  async goto(query) {
    await this.page.goto(`/news/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  /**
   * The page echoes the query as `Запит: "<query>"`.
   * @param {string} query
   */
  queryEcho(query) {
    return this.page.getByText(`Запит: "${query}"`);
  }

  /**
   * Shown instead of results when nothing matches.
   * @param {string} query
   */
  emptyState(query) {
    return this.page.getByText(`Нічого не знайдено за запитом "${query}"`);
  }

  async goToNextPage() {
    await this.nextPageLink.click();
  }
}

module.exports = { SearchResultsPage };
