const { test, expect } = require('./fixtures');
const { RatingsSsbuPage } = require('../src/pages/RatingsSsbuPage');

test.describe('Рейтинг гравців SSBU', () => {
  /** @type {RatingsSsbuPage} */
  let ratings;

  test.beforeEach(async ({ page }) => {
    ratings = new RatingsSsbuPage(page);
    await ratings.goto();
  });

  test('завантажується з коректним title і заголовком', async ({ page }) => {
    await expect(page).toHaveTitle(/Рейтинг гравців SSBU/);
    await expect(ratings.mainHeading).toBeVisible();
  });

  test('таблиця має очікуваний набір колонок', async () => {
    await expect(ratings.columnHeaders).toHaveText([
      '#',
      'Гравець',
      'Рейтинг',
      'W',
      'L',
      '% перемог',
      'Матчі',
      'Турніри',
      'ELO',
    ]);
  });

  test('таблиця не порожня', async () => {
    expect(await ratings.rows.count()).toBeGreaterThan(0);
  });

  // Перевірки цілісності даних: колонки мусять узгоджуватись між собою.
  // Асертимо на обчислені значення, а не на конкретні імена чи числа — склад
  // рейтингу змінюється після кожного турніру.
  test('місця пронумеровані послідовно з 1', async () => {
    const rows = await ratings.readRows();
    expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1));
  });

  test('рейтинг відсортований за спаданням', async () => {
    const rows = await ratings.readRows();
    const ratingValues = rows.map((r) => r.rating);
    expect(ratingValues).toEqual([...ratingValues].sort((a, b) => b - a));
  });

  test('перемоги плюс поразки дорівнюють кількості матчів', async () => {
    const rows = await ratings.readRows();
    const mismatched = rows.filter((r) => r.wins + r.losses !== r.matches);
    expect(mismatched, 'рядки з розбіжністю W+L та матчів').toEqual([]);
  });

  test('відсоток перемог узгоджений з W та кількістю матчів', async () => {
    const rows = await ratings.readRows();
    const mismatched = rows.filter((r) => {
      if (!r.matches) return false;
      const expected = Math.round((r.wins / r.matches) * 100);
      // Допуск на округлення сайту в інший бік.
      return Math.abs(expected - r.winPercent) > 1;
    });
    expect(mismatched, 'рядки з невідповідним % перемог').toEqual([]);
  });
});
