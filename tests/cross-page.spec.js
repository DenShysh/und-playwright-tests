const { test, expect } = require('./fixtures');
const { TournamentsPage } = require('../src/pages/TournamentsPage');
const { RatingsSsbuPage } = require('../src/pages/RatingsSsbuPage');

/**
 * Ті самі дані рейтингу подані у двох місцях: скорочений віджет у сайдбарі
 * /tournaments і повна таблиця /tournaments/ratings-ssbu. Розбіжність між ними —
 * реальний дефект (застарілий кеш віджета, інше джерело), якого не побачить
 * жоден тест, що перевіряє лише одну сторінку.
 *
 * Асертимо на збіг МІЖ сторінками, а не на конкретні імена й числа: склад
 * рейтингу змінюється після кожного турніру.
 */
test.describe('Консистентність рейтингу між сторінками', () => {
  test('сайдбар турнірів повторює верхівку повної таблиці', async ({ page }) => {
    const tournaments = new TournamentsPage(page);
    await tournaments.goto();
    const sidebar = await tournaments.readLeaderboard();

    expect(sidebar.length, 'сайдбар не порожній').toBeGreaterThan(0);

    const ratings = new RatingsSsbuPage(page);
    await ratings.goto();
    const full = await ratings.readRows();

    expect(
      full.length,
      'повна таблиця має бути не коротшою за сайдбар'
    ).toBeGreaterThanOrEqual(sidebar.length);

    const top = full.slice(0, sidebar.length).map((r) => ({
      rank: r.rank,
      player: r.player,
      rating: r.rating,
    }));

    expect(sidebar).toEqual(top);
  });

  test('посилання "Повний рейтинг" веде на таблицю з тим самим лідером', async ({ page }) => {
    const tournaments = new TournamentsPage(page);
    await tournaments.goto();
    const [leader] = await tournaments.readLeaderboard();

    await tournaments.openFullRating();

    const ratings = new RatingsSsbuPage(page);
    const [firstRow] = await ratings.readRows();

    expect(firstRow.player).toBe(leader.player);
    expect(firstRow.rating).toBe(leader.rating);
  });

  test('гравці сайдбару присутні в повній таблиці без дублікатів', async ({ page }) => {
    const tournaments = new TournamentsPage(page);
    await tournaments.goto();
    const sidebar = await tournaments.readLeaderboard();

    const ratings = new RatingsSsbuPage(page);
    await ratings.goto();
    const full = await ratings.readRows();
    const players = full.map((r) => r.player);

    const missing = sidebar.map((r) => r.player).filter((name) => !players.includes(name));
    expect(missing, 'гравці сайдбару, яких немає в повній таблиці').toEqual([]);

    const duplicates = players.filter((name, i) => players.indexOf(name) !== i);
    expect(duplicates, 'дубльовані гравці в повній таблиці').toEqual([]);
  });
});
