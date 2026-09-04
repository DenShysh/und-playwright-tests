// @ts-check

/**
 * Page Object Model for the UND release calendar (/games).
 * Built from a live browser_snapshot of https://und.com.ua/games
 *
 * Filters are server-side: every control submits and comes back as a query
 * parameter (?q=, ?platform=, ?sort=, …), and the form re-renders with the
 * submitted values selected.
 */
class GamesPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    this.mainHeading = page.getByRole('heading', { name: 'Календар релізів', level: 1 });
    this.filterPanelHeading = page.getByRole('heading', { name: 'Фільтри', level: 2 });

    // Панель фільтрів поводиться по-різному за макетами, причому НЕ одразу:
    // сторінка віддається з розгорнутою панеллю в обох макетах, а на мобільному
    // скрипт згортає її приблизно через 300–400 мс ПІСЛЯ події `load` (заміряно).
    // Тому подія життєвого циклу тут нічого не гарантує — див. openFilterPanel().
    //
    // Надійний дискримінатор макета, доступний одразу: видимість самого тогла —
    // на мобільному true, на десктопі false (прихований медіазапитом). Локатор по
    // класу, а не по назві: текст кнопки перемикається
    // ("Показати фільтри" ↔ "Згорнути фільтри").
    this.filterPanel = page.locator('aside.und-games-filter-panel');
    this.collapsedFilterPanel = page.locator('aside.und-games-filter-panel.is-collapsed');
    this.filterPanelToggle = page.locator('button.und-games-filter-panel__toggle');

    // Скидання фільтрів — звичайне посилання на /games, а не кнопка форми.
    this.resetFiltersLink = page.locator('a.und-filter-btn--reset');

    // Модалка «Розширені фільтри» — окрема поверхня з ВЛАСНИМ набором контролів
    // (genre, engine, keyword, franchise, external_source, age, publisher), а не
    // тими самими, що platform/sort у компактному рядку.
    this.advancedFiltersButton = page.locator('button[data-und-advanced-open]');
    this.advancedFiltersModal = page.locator('#und-games-advanced-filters');
    this.advancedFiltersClose = this.advancedFiltersModal.locator(
      '.und-games-filter-modal__close'
    );
    // Сайт підміняє нативні <select> кастомними тригерами й лишає select прихованим
    // виключно для сабміту форми — в ОБОХ макетах.
    this.advancedCustomTriggers = this.advancedFiltersModal.locator(
      '.und-games-filter-custom__trigger'
    );

    // The filter <select>s carry NO id and their <label>s are not associated with
    // them (no `for`, no wrapping), so getByLabel cannot reach these controls.
    // Anchoring on the submitted `name` is the only stable, meaningful handle.
    // TODO: labels are not programmatically associated — see a11y finding.
    this.nameSearchInput = page.locator('input.und-games-filter-input[name="q"]');
    this.sortSelect = page.locator('select[name="sort"]');
    this.contentSelect = page.locator('select[name="content"]');
    this.platformSelect = page.locator('select[name="platform"]');
    this.genreSelect = page.locator('select[name="genre"]');
    this.publisherSelect = page.locator('select[name="publisher"]');
    this.releaseFromInput = page.locator('input[name="release_from"]');
    this.releaseToInput = page.locator('input[name="release_to"]');
    this.upcomingOnlyCheckbox = page.locator('input[name="upcoming_only"]');

    this.applyButton = page.getByRole('button', { name: 'Застосувати' }).first();

    // Results: cards are grouped under month headings.
    this.resultsPanel = page.locator('.und-games-content-panel');
    this.gameCards = page.locator('.und-game-card');
    this.gameTitles = page.locator('.und-game-card__title');
    this.monthHeadings = page.locator('h2.und-games-month__title');

    // Scoped to the results panel on purpose: each filter dropdown owns its own
    // hidden "Нічого не знайдено" node, so an unscoped text locator matches 11
    // elements. The results-area wording is different again.
    this.emptyState = this.resultsPanel.getByText('За вибраними фільтрами релізів не знайдено.');
  }

  /**
   * A game card's personal status button — "Хочу" (wishlist), "Маю" (owned),
   * "Граю" (playing) or "Пройдено" (completed). Only rendered when authenticated
   * (tests/authed.fixtures.js); anonymous visitors don't see `.und-game-card__personal`
   * at all. No "dropped" button here — that status is only reachable from the
   * cabinet's select (see CabinetPage.STATUS_VALUES).
   * @param {import('@playwright/test').Locator} card
   * @param {'wishlist' | 'owned' | 'playing' | 'completed'} status
   */
  statusButton(card, status) {
    return card.locator(`[data-und-card-status="${status}"]`);
  }

  /**
   * First card whose wishlist button is NOT active for the current user — a safe,
   * non-destructive pick for add/remove tests. Filtering on `aria-pressed="false"`
   * guarantees the test never touches a game the account has genuinely wishlisted.
   *
   * Async, unlike the other locator-returning methods here: `.und-game-card__personal`
   * renders immediately, but the actual status `<button>`s (and their real
   * `aria-pressed`) are populated by a separate client-side call shortly after —
   * `.filter({ has })` + an immediate `.count()` doesn't wait for that, so callers
   * calling it too early would see zero matches and wrongly skip.
   */
  async firstUntouchedWishlistCard() {
    await this.gameCards.first().locator('[data-und-card-status="wishlist"]').waitFor({ state: 'attached' });
    return this.gameCards
      .filter({ has: this.page.locator('[data-und-card-status="wishlist"][aria-pressed="false"]') })
      .first();
  }

  /**
   * Stable locator for a card by its `data-game-id` — unlike a `.filter({ has })`
   * locator (e.g. firstUntouchedWishlistCard's return value), this doesn't
   * re-evaluate a condition that the test's own actions change out from under it.
   * Callers that pick a card via a filtered/first-match locator should read its
   * `data-game-id` once and switch to this for every action afterward.
   * @param {string} gameId
   */
  cardById(gameId) {
    return this.page.locator(`.und-game-card[data-game-id="${gameId}"]`);
  }

  /**
   * Finds a game card by EXACT title via the search filter, with the release-date
   * window widened. The default listing (and `q=` search alone) silently drops
   * older releases once enough time passes — a base game can vanish from it once
   * its own DLC starts appearing, which is exactly how re-locating "Elden Ring" by
   * a plain `hasText` substring match once grabbed "Elden Ring: Shadow of the
   * Erdtree" instead (both contain "Elden Ring") on the unfiltered default view.
   * `exact: true` on the heading avoids that collision; `release_from` avoids the
   * silent date-window drop.
   * @param {string} title
   */
  async findCardByTitle(title) {
    await this.goto(`q=${encodeURIComponent(title)}&release_from=2000-01-01`);
    return this.gameCards.filter({ has: this.page.getByRole('heading', { name: title, exact: true }) }).first();
  }

  /** @param {string} [query] optional query string, e.g. 'q=lamp&platform=switch-2' */
  async goto(query) {
    await this.page.goto(`/games${query ? `?${query}` : ''}`, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Гарантує, що фільтри придатні до взаємодії. Ідемпотентний, тож викликається
   * безумовно в обох макетах.
   *
   * Чому не можна просто перевірити видимість поля: сторінка приходить із розгорнутою
   * панеллю В ОБОХ макетах, і лише через ~300–400 мс після `load` скрипт згортає її на
   * мобільному. Одноразова перевірка `isVisible()` потрапляє у це вікно й повертає true,
   * після чого панель згортається вже під час асертів — класична гонка.
   *
   * Тому спершу визначаємо макет за видимістю тогла (доступна одразу й стабільна:
   * mobile=true, desktop=false), а на мобільному ЧЕКАЄМО усталеного згорнутого стану,
   * і лише потім розгортаємо. Інакше клік по ще не згорнутій панелі згорнув би її.
   */
  async openFilterPanel() {
    await this.filterPanelToggle.waitFor({ state: 'attached' });
    if (!(await this.filterPanelToggle.isVisible())) return; // десктоп: завжди розгорнута

    await this.collapsedFilterPanel.waitFor({ state: 'attached' });
    await this.filterPanelToggle.click();
    await this.nameSearchInput.waitFor({ state: 'visible' });
  }

  /**
   * Відкриває модалку «Розширені фільтри». На мобільному кнопка живе всередині
   * панелі фільтрів, тож панель попередньо розгортається.
   */
  async openAdvancedFilters() {
    await this.openFilterPanel();
    await this.advancedFiltersButton.click();
    await this.advancedFiltersClose.waitFor({ state: 'visible' });
  }

  async resetFilters() {
    await this.resetFiltersLink.click();
    await this.page.waitForURL(/\/games$/);
  }

  /** @param {string} name */
  async searchByName(name) {
    await this.openFilterPanel();
    await this.nameSearchInput.fill(name);
    await this.nameSearchInput.press('Enter');
  }

  /** @param {string} platform platform slug, e.g. 'switch-2' */
  async filterByPlatform(platform) {
    await this.platformSelect.selectOption(platform);
  }

  /** @param {string} sort sort key, e.g. 'name' */
  async sortBy(sort) {
    await this.sortSelect.selectOption(sort);
  }

  /** @param {string} title */
  async openGameByTitle(title) {
    await this.gameCards.filter({ hasText: title }).locator('a').first().click();
  }
}

module.exports = { GamesPage };
