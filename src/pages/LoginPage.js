// @ts-check

/**
 * Page Object Model for the UND sign-in page (/web/login).
 * Built from a live browser_snapshot of https://und.com.ua/web/login
 *
 * PRODUCTION SAFETY: this class deliberately exposes NO method that submits real
 * credentials. The site has no staging environment, so repeated failed sign-ins
 * risk rate limiting or account lockout. Only the form's presence and the
 * browser-native required-field validation are safe to exercise.
 *
 * Both fields here ARE properly label-associated (unlike the /games filters),
 * so getByLabel is the correct locator.
 */
class LoginPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // The page has no h1 at all — its title is an h2. See a11y finding.
    this.heading = page.getByRole('heading', { name: 'Увійти в акаунт', level: 2 });

    this.form = page.locator('main form');
    this.emailInput = page.getByLabel('Ел. пошта');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: 'Вхід' });

    this.resetPasswordLink = page.getByRole('link', { name: 'Скинути пароль' });
    this.googleSignInLink = page.getByRole('link', { name: /Зайдіть через Google/ });
    this.signUpLink = page.getByRole('link', { name: 'Не маєте облікового запису?' });

    // Anti-CSRF token the form posts back; its presence is worth asserting.
    this.csrfToken = page.locator('main form input[name="csrf_token"]');
  }

  async goto() {
    await this.page.goto('/web/login', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Fills the form WITHOUT submitting — for validation and state assertions only.
   * @param {string} email
   * @param {string} password
   */
  async fillCredentials(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Attempts submit so the browser's native required-field validation fires.
   * Safe only while the required fields are empty — an empty form is never sent
   * to the server, so no sign-in attempt is made.
   */
  async submitEmptyForm() {
    await this.submitButton.click();
  }

  /**
   * Reads the browser's native validation message for a required field.
   * @param {'email' | 'password'} field
   * @returns {Promise<string>}
   */
  async validationMessage(field) {
    const locator = field === 'email' ? this.emailInput : this.passwordInput;
    return locator.evaluate((el) => /** @type {HTMLInputElement} */ (el).validationMessage);
  }
}

module.exports = { LoginPage };
