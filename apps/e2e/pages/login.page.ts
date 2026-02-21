/**
 * Propósito: Page Object del login general (compartido por todos los roles).
 *
 * Importante:
 * - Para evitar bloqueos por intentos fallidos, este Page Object valida que los inputs estén visibles
 *   antes de intentar enviar el formulario.
 */

import { expect, type Locator, type Page } from '@playwright/test';

export type LoginPageLocators = {
  emailInput: Locator;
  passwordInput: Locator;
  submitButton: Locator;
};

export class LoginPage {
  private readonly page: Page;
  private readonly locators: LoginPageLocators;
  readonly logo: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.locators = {
      emailInput: page
        .getByLabel(/email|correo/i)
        .or(page.getByPlaceholder(/email|correo/i))
        .or(page.locator('input[type="email"]'))
        .or(page.locator('input[name="email"]')),
      passwordInput: page
        .getByLabel(/contrase[ñn]a|password/i)
        .or(page.getByPlaceholder(/contrase[ñn]a|password/i))
        .or(page.locator('input[type="password"]'))
        .or(page.locator('input[name="password"]')),
      submitButton: page
        .getByRole('button', { name: /ingresar|login|acceder|entrar/i })
        .or(page.locator('button[type="submit"]')),
    };

    // Elementos públicos para tests (compatibilidad + claridad)
    this.logo = page.locator('header img[alt="Grupo BCA"], img[alt="Grupo BCA"]').first();
    this.emailInput = this.locators.emailInput;
    this.passwordInput = this.locators.passwordInput;
    this.submitButton = this.locators.submitButton;
  }

  /**
   * Abre la pantalla de login.
   */
  async goto(loginPath: string = '/login') {
    await this.page.goto(loginPath, { waitUntil: 'domcontentloaded' });
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  /**
   * Realiza login y espera la redirección fuera de `/login`.
   * Nota: no imprime credenciales.
   */
  async login(params: { email: string; password: string; expectedPathPrefix?: RegExp }): Promise<void>;
  async login(email: string, password: string, expectedPathPrefix?: RegExp): Promise<void>;
  async login(
    arg1: { email: string; password: string; expectedPathPrefix?: RegExp } | string,
    arg2?: string,
    arg3?: RegExp
  ): Promise<void> {
    const params = typeof arg1 === 'string'
      ? { email: arg1, password: arg2 ?? '', expectedPathPrefix: arg3 }
      : arg1;

    await this.fillCredentials(params.email, params.password);
    await this.submit();

    // Esperamos navegación y salimos del login
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page).not.toHaveURL(/\/login\/?$/i);

    if (params.expectedPathPrefix) {
      await expect(this.page).toHaveURL(params.expectedPathPrefix);
    }
  }

  /**
   * Completa email y contraseña.
   */
  async fillCredentials(email: string, password: string) {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Envía el formulario de login.
   */
  async submit() {
    // Guardas para evitar submits “a ciegas”
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }
}


