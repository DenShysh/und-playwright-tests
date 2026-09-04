const { test, expect } = require('./fixtures');
const { TournamentsPage } = require('../src/pages/TournamentsPage');

test.describe('Турніри', () => {
  /** @type {TournamentsPage} */
  let tournaments;

  test.beforeEach(async ({ page }) => {
    tournaments = new TournamentsPage(page);
    await tournaments.goto();
  });

  test('завантажується з коректним title і заголовком', async ({ page }) => {
    await expect(page).toHaveTitle('Турніри та Змагання');
    await expect(tournaments.mainHeading).toBeVisible();
  });

  test('показує список турнірів', async () => {
    expect(await tournaments.tournamentCards.count()).toBeGreaterThan(0);
  });

  test('кількість карток збігається з лічильником у табі', async () => {
    const declared = await tournaments.tabCount('all');
    expect(declared).toBeGreaterThan(0);
    await expect(tournaments.tournamentCards).toHaveCount(declared);
  });

  test('фільтр за грою лишає лише турніри цієї гри', async ({ page }) => {
    const game = 'Splatoon 3';
    await tournaments.filterByGame(game);

    await expect(page).toHaveURL(/\/tournaments\?game=/);
    await expect(tournaments.gameFilter).toHaveValue(game);

    const labels = await tournaments.cardGameLabels.allTextContents();
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.trim()).toBe(game);
    }
  });

  test('фільтр за грою оновлює лічильник таба', async () => {
    await tournaments.filterByGame('Splatoon 3');

    const declared = await tournaments.tabCount('all');
    await expect(tournaments.tournamentCards).toHaveCount(declared);
  });

  test('таб "Завершені" показує лише завершені турніри', async ({ page }) => {
    await tournaments.showFinished();

    await expect(page).toHaveURL(/\/tournaments\?status=finished/);

    const statuses = await tournaments.tournamentCards.locator('.und-badge').allTextContents();
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(status.trim()).toBe('Завершено');
    }
  });

  test('картка турніру веде на його сторінку', async ({ page }) => {
    const link = tournaments.tournamentCards.first().locator('a').first();
    const href = await link.getAttribute('href');

    await link.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test('сайдбар показує рейтинг і веде на повну таблицю', async ({ page }) => {
    await expect(tournaments.leaderboardHeading).toBeVisible();
    expect(await tournaments.leaderboardRows.count()).toBeGreaterThan(0);

    await tournaments.openFullRating();
    await expect(page).toHaveURL('https://und.com.ua/tournaments/ratings-ssbu');
  });
});
