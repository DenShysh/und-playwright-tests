const { test, expect } = require('./fixtures');
const { LoginPage } = require('../src/pages/LoginPage');

/**
 * ПРОДАКШН: жоден тест тут не відправляє креденшели. Сайт не має staging, тож
 * повторювані невдалі спроби входу ризикують рейт-лімітом чи блокуванням акаунтів.
 * Перевіряємо лише наявність форми та браузерну валідацію обовʼязкових полів —
 * порожня форма взагалі не доходить до сервера.
 */
test.describe('Сторінка входу', () => {
  /** @type {LoginPage} */
  let login;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    await login.goto();
  });

  test('завантажується з коректним title і заголовком', async ({ page }) => {
    await expect(page).toHaveTitle(/Login/);
    await expect(login.heading).toBeVisible();
  });

  test('форма містить поля та кнопку входу', async () => {
    await expect(login.emailInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.submitButton).toBeVisible();
  });

  test('поле пароля приховує ввід', async () => {
    await expect(login.passwordInput).toHaveAttribute('type', 'password');
  });

  test('форма містить CSRF-токен', async () => {
    await expect(login.csrfToken).toHaveCount(1);
  });

  test('обидва поля обовʼязкові', async () => {
    // Перевіряємо властивість DOM, а не атрибут: сайт рендерить required="required",
    // тож асерт на порожнє значення атрибута був би прив'язкою до способу рендеру.
    const emailRequired = await login.emailInput.evaluate(
      (el) => /** @type {HTMLInputElement} */ (el).required
    );
    const passwordRequired = await login.passwordInput.evaluate(
      (el) => /** @type {HTMLInputElement} */ (el).required
    );
    expect(emailRequired).toBe(true);
    expect(passwordRequired).toBe(true);
  });

  test('порожня форма не відправляється', async ({ page }) => {
    await login.submitEmptyForm();

    // Браузер блокує відправку — URL не змінюється, запит на сервер не йде.
    await expect(page).toHaveURL(/\/web\/login$/);

    // Текст повідомлення залежить від рушія та локалі, тож перевіряємо сам факт
    // невалідності, а не конкретний рядок.
    const isValid = await login.emailInput.evaluate(
      (el) => /** @type {HTMLInputElement} */ (el).checkValidity()
    );
    expect(isValid).toBe(false);
    expect(await login.validationMessage('email')).not.toBe('');
  });

  const links = [
    { locator: 'resetPasswordLink', path: '/web/reset_password' },
    { locator: 'signUpLink', path: '/web/signup' },
  ];
  for (const { locator, path } of links) {
    test(`посилання "${locator}" веде на ${path}`, async () => {
      await expect(login[locator]).toHaveAttribute('href', path);
    });
  }

  test('вхід через Google веде на акаунти Google', async () => {
    await expect(login.googleSignInLink).toHaveAttribute(
      'href',
      /^https:\/\/accounts\.google\.com\/o\/oauth2\/auth/
    );
  });
});
