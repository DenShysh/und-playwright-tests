const { test, expect } = require('./fixtures');
const { HomePage } = require('../src/pages/HomePage');

test.describe('Мова', () => {
  // Десктоп використовує <details>-дропдаун; мобільний інлайнить мовні лінки
  // у бургер-меню — той шлях покриває responsive.spec.js.
  test.skip(({ isMobile }) => Boolean(isMobile), 'Мобільний макет має власний перемикач');

  test('перемикання на англійську змінює версію сайту', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.langToggle).toContainText('UK');
    await home.switchToEnglish();

    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/i);

    // Свідомо НЕ перевіряємо frontend_lang: українська сторінка асинхронно тягне
    // /website/translations/...?lang=uk_UA, і та відповідь несе Set-Cookie
    // frontend_lang=uk_UA. Запит стартує ще до кліку, тож його відповідь може
    // прийти вже ПІСЛЯ 302 від /public/lang/select (який ставить en_US) і перезатерти
    // мову назад на uk_UA — назавжди: пізніших записів у цю cookie немає, тож
    // очікування не рятує. Заміряно на живому проді: ~2 з 6 прогонів.
    // und_public_lang пише лише сам перемикач, тож вона стабільна.
    const langCookie = (await page.context().cookies()).find((c) => c.name === 'und_public_lang');
    expect(langCookie?.value).toMatch(/en/i);
  });
});

test.describe('Цілісність посилань', () => {
  test('усі посилання головної навігації віддають успішний статус', async ({ page, request }) => {
    const home = new HomePage(page);
    await home.goto();

    // Читаємо href безпосередньо з DOM, тож перевірка не залежить від того,
    // чи навігація видима в поточному макеті.
    const hrefs = await home.nav.locator('a').evaluateAll((links) =>
      links.map((l) => /** @type {HTMLAnchorElement} */ (l).href)
    );
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), `${href} має віддавати < 400`).toBeLessThan(400);
    }
  });

  test('посилання футера не ведуть на биті сторінки', async ({ page, request }) => {
    const home = new HomePage(page);
    await home.goto();

    // Тільки внутрішні: зовнішні соцмережі можуть блокувати серверні запити.
    const hrefs = await home.footer.locator('a').evaluateAll((links) =>
      links
        .map((l) => /** @type {HTMLAnchorElement} */ (l).href)
        .filter((href) => href.startsWith('https://und.com.ua'))
    );
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), `${href} має віддавати < 400`).toBeLessThan(400);
    }
  });

  test('skip-link веде на існуючий блок контенту', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.skipToContentLink).toHaveAttribute('href', '#wrap');
    await expect(page.locator('#wrap')).toHaveCount(1);
  });
});
