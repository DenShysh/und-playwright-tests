// @ts-check
const path = require('path');
// Anchored to this file's directory, not process.cwd(): the VS Code Playwright
// extension can launch the runner with a different cwd (e.g. the workspace root
// in this multi-client repo), which would silently miss clients/UND/.env.
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Earlier timeouts traced to the MCP Playwright browser window contending for
  // focus, not to the prod site — verified stable at 4 real workers.
  workers: 4,
  // Локальний retry не ховає проблему: тест, який пройшов із другого разу, звітується
  // як flaky й лишається видимим у звіті разом із трейсом першої спроби.
  retries: process.env.CI ? 2 : 1,
  reporter: 'html',
  // Бюджет часу узгоджений так, щоб СУМА лімітів однієї фази була помітно меншою за
  // таймаут тесту. Інакше beforeEach (навігація + очікування банера) вичерпує весь
  // бюджет і падає узагальненим "timeout while running beforeEach hook" замість
  // конкретної помилки, яка називає операцію.
  //   beforeEach:  навігація 30 + банер 10          = 40 с
  //   тіло тесту:  дія 25 + асерт 10                = 35 с
  //   разом 75 с < 90 с
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || 'https://und.com.ua',
    // Явна локаль обовʼязкова: Odoo-роути авторизації (/web/login) поважають
    // Accept-Language і редіректять на /en/ з англійським контентом, тоді як фронтові
    // сторінки лишаються українськими. Без цього мова залежала б від дефолту браузера.
    locale: 'uk-UA',
    trace: 'on-first-retry',
    navigationTimeout: 30_000,
    // Клік чекає на actionability (видимий, стабільний, приймає події). На живому проді
    // під навантаженням 15 с виявилось замало; обмеження лишаємо, щоб зависла дія не
    // зʼїдала бюджет тесту мовчки.
    actionTimeout: 25_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Актуально ЛИШЕ для headed-прогонів (напр. Testing-панель VS Code з "Show browser").
        //
        // Playwright вважає елемент придатним для кліку, коли його bounding box незмінний
        // протягом двох послідовних кадрів анімації. У перекритому чи згорнутому вікні
        // Firefox припиняє малювання — кадрів немає, стабільність не підтверджується,
        // і клік чекає до тайм-ауту. Chromium цього не має, бо Playwright запускає його з
        // --disable-backgrounding-occluded-windows та спорідненими прапорцями; Firefox
        // таких не отримує, тож вимикаємо відстеження перекриття вручну.
        //
        // Headless-прогонів не стосується: там вікна немає, отже й перекривати нічого.
        launchOptions: {
          firefoxUserPrefs: {
            'widget.windows.window_occlusion_tracking.enabled': false,
          },
        },
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Mobile layout swaps the desktop nav for a hamburger; responsive specs target this.
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
