const { test, expect } = require('./fixtures');
const { GamesPage } = require('../src/pages/GamesPage');

test.describe('Календар релізів', () => {
  /** @type {GamesPage} */
  let games;

  test.beforeEach(async ({ page }) => {
    games = new GamesPage(page);
    await games.goto();
  });

  test('завантажується з коректним title і заголовком', async ({ page }) => {
    await expect(page).toHaveTitle(/Календар релізів/);
    await expect(games.mainHeading).toBeVisible();
  });

  test('показує ігри, згруповані за місяцями', async () => {
    expect(await games.gameCards.count()).toBeGreaterThan(0);
    expect(await games.monthHeadings.count()).toBeGreaterThan(0);
  });

  test('панель фільтрів доступна', async () => {
    await expect(games.filterPanelHeading).toBeVisible();

    // На мобільному панель згорнута за кнопкою "Показати фільтри"; на десктопі виклик
    // нічого не робить. Так тест перевіряє однакову вимогу в обох макетах, не
    // пропускаючи мобільний і не дублюючи себе.
    await games.openFilterPanel();

    await expect(games.nameSearchInput).toBeVisible();
    // platformSelect лишається прихованим В ОБОХ макетах: сайт підміняє нативний
    // <select> кастомним віджетом, а сам select тримає лише для сабміту форми.
    await expect(games.platformSelect).toBeAttached();
  });

  test('пошук за назвою звужує список і зберігає запит', async ({ page }) => {
    await games.goto('q=lamp');

    await expect(page).toHaveURL(/[?&]q=lamp/);
    await expect(games.nameSearchInput).toHaveValue('lamp');

    const titles = await games.gameTitles.allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) {
      expect(title.toLowerCase()).toContain('lamp');
    }
  });

  test('фільтр за платформою потрапляє в URL і лишається обраним', async ({ page }) => {
    await games.goto('platform=switch-2');

    await expect(page).toHaveURL(/[?&]platform=switch-2/);
    await expect(games.platformSelect).toHaveValue('switch-2');
    expect(await games.gameCards.count()).toBeGreaterThan(0);
  });

  test('порожній результат показує відповідне повідомлення', async () => {
    // Елемент порожнього стану присутній у DOM завжди — перевіряємо саме видимість.
    await games.goto('q=zzzqqqxyz123');

    await expect(games.emptyState).toBeVisible();
    await expect(games.gameCards).toHaveCount(0);
  });

  test('картка гри веде на її сторінку', async ({ page }) => {
    const link = games.gameCards.first().locator('a').first();
    const href = await link.getAttribute('href');

    await link.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});
