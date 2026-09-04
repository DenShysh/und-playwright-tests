const { test, expect } = require('@playwright/test');
const { HomePage } = require('../src/pages/HomePage');
const { ArticlePage } = require('../src/pages/ArticlePage');

// An article that embeds a YouTube video — the embed is gated behind optional-cookie
// consent, which makes it the observable proof that the consent choice does something.
const ARTICLE_WITH_EMBED =
  'mario-kart-8-deluxe-400-update-out-now-patch-notes-nintendo-switch-2-improvements-and-features-more';

// Ці тести навмисно працюють на чистому контексті (базовий `test`, без фікстури
// з виставленою cookie згоди) — саме банер тут є предметом перевірки.

test.describe('Cookie consent — банер закривається', () => {
  test('"Я погоджуюсь" закриває банер', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForConsentBanner();
    await expect(home.cookieAcceptButton).toBeVisible();
    await home.acceptCookies();
    await expect(home.cookieAcceptButton).toBeHidden();
  });

  test('"Тільки найнеобхідніше" також закриває банер', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.acceptNecessaryCookiesOnly();
    await expect(home.cookieNecessaryOnlyButton).toBeHidden();
  });
});

test.describe('Cookie consent — семантика вибору', () => {
  test('"Я погоджуюсь" зберігає повну згоду (optional: true)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.acceptCookies();

    const consent = await home.getConsentCookie();
    expect(consent).toMatchObject({ required: true, optional: true });
  });

  test('"Тільки найнеобхідніше" зберігає обмежену згоду (optional: false)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.acceptNecessaryCookiesOnly();

    const consent = await home.getConsentCookie();
    expect(consent).toMatchObject({ required: true, optional: false });
  });
});

test.describe('Cookie consent — персистентність', () => {
  test('банер не повертається після перезавантаження', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.acceptCookies();
    await expect(home.cookieAcceptButton).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });
    // Банер вставляється скриптом ~1.5 с після domcontentloaded, тож одразу після
    // перезавантаження його немає В БУДЬ-ЯКОМУ разі. Це перевірка відсутності
    // відкладеної події, тому вона вимагає паузи, довшої за саму затримку —
    // без неї тест проходив би хибно-позитивно, навіть якби згода не зберігалась.
    await page.waitForTimeout(4_000);
    await expect(home.cookieAcceptButton).toBeHidden();
  });

  test('банер повертається після очищення cookies', async ({ page, context }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.acceptCookies();
    await expect(home.cookieAcceptButton).toBeHidden();

    await context.clearCookies();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.waitForConsentBanner();
    await expect(home.cookieAcceptButton).toBeVisible();
  });
});

test.describe('Cookie consent — функціональний наслідок вибору', () => {
  test('обмежена згода блокує сторонній ембед', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.acceptNecessaryCookiesOnly();

    const article = new ArticlePage(page);
    await article.goto(ARTICLE_WITH_EMBED);

    await expect(article.blockedEmbedPlaceholder).toBeVisible();
    await expect(article.youtubeEmbed).toHaveCount(0);
  });

  test('повна згода завантажує сторонній ембед', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.acceptCookies();

    const article = new ArticlePage(page);
    await article.goto(ARTICLE_WITH_EMBED);

    await expect(article.youtubeEmbed).toHaveCount(1);
    await expect(article.blockedEmbedPlaceholder).toHaveCount(0);
  });
});
