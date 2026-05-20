import { expect, Locator, Page } from '@playwright/test';

export class AvuaSignUpPage {
  readonly page: Page;

  // Using role+name because this is the most stable and accessible CTA locator on the home page.
  readonly exploreJobOpportunitiesLink: Locator;
  // Using role+name because the sign-up entry action is expected to be surfaced as a button-like CTA.
  readonly signUpButton: Locator;
  // Using role+name first to target the visible upload action users click before file selection.
  readonly uploadResumeButton: Locator;
  // Using CSS file-input locator because resume upload commonly uses a hidden native input.
  readonly resumeFileInput: Locator;
  // Using label-based locator because this field is expected to be explicitly labeled after AI prefill.
  readonly jobTitleInput: Locator;
  // Using label-based locator because email is a standard, accessible form field.
  readonly emailInput: Locator;
  // Using label-based combobox locator because nationality is usually implemented as a custom dropdown.
  readonly nationalityDropdown: Locator;
  // Using role+name because this is the primary submit action for account creation.
  readonly createMyAccountButton: Locator;
  // Using text-based locator because confirmation is rendered as a status message containing dynamic email.
  readonly signInLinkSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.exploreJobOpportunitiesLink = page.getByRole('link', {
      name: /Explore Job Opportunities/i,
    });
    this.signUpButton = page.getByRole('button', { name: /Sign Up/i });
    this.uploadResumeButton = page.getByRole('button', { name: /Upload Resume/i });
    this.resumeFileInput = page.locator('input[type="file"]');
    this.jobTitleInput = page
      .getByLabel(/Job Title|Current Job Title|Role/i)
      .or(page.getByPlaceholder(/Job Title|Current Job Title|Role/i))
      .first();
    this.emailInput = page
      .getByLabel(/Email|Email Address/i)
      .or(page.getByPlaceholder(/Email|Email Address/i))
      .first();
    this.nationalityDropdown = page
      .getByLabel(/Nationality/i)
      .or(page.getByRole('combobox', { name: /Nationality/i }))
      .or(page.getByPlaceholder(/Search nationality/i))
      .or(page.getByRole('textbox', { name: /Search nationality/i }))
      .first();
    this.createMyAccountButton = page
      .getByRole('button', { name: /Create My Account|Create Account/i })
      .or(page.getByText(/Create my account|Create My Account|Create Account/i))
      .first();
    this.signInLinkSuccessMessage = page.getByText(
      /we have sent a secured sign-in link to/i,
      { exact: false },
    );
  }

  async gotoHomePage(): Promise<void> {
    await this.page.goto('/');
  }

  async goToApplicantSignUpPage(): Promise<void> {
    await this.gotoHomePage();

    // Keep scenario intent (home -> explore), but fallback to direct route if responsive nav hides CTA.
    if (await this.exploreJobOpportunitiesLink.first().isVisible()) {
      await this.exploreJobOpportunitiesLink.first().click();
    } else {
      await this.page.goto('/applicant');
    }

    if (await this.signUpButton.first().isVisible()) {
      await this.signUpButton.first().click();
    } else {
      await this.page.goto('/signup');
    }

    await expect(this.page).toHaveURL(/\/signup/i);
  }

  async uploadResume(filePath: string): Promise<void> {
    if (await this.uploadResumeButton.first().isVisible()) {
      await this.uploadResumeButton.first().click();
    }
    await this.resumeFileInput.first().setInputFiles(filePath);
  }

  async waitForAiPrefill(): Promise<void> {
    // Wait for post-upload form to render first, then verify AI prefill populated core field(s).
    await expect(this.createMyAccountButton).toBeVisible({ timeout: 45000 });
    await expect(this.jobTitleInput).toBeVisible({ timeout: 45000 });
    await expect(this.jobTitleInput).toBeEnabled({ timeout: 45000 });
    await expect
      .poll(
        async () => {
          const jobTitleLen = (await this.jobTitleInput.inputValue().catch(() => '')).trim().length;
          const emailLen = (await this.emailInput.inputValue().catch(() => '')).trim().length;
          return Math.max(jobTitleLen, emailLen);
        },
        {
        timeout: 45000,
        message: 'Expected at least one key field to be prefilled by AI resume analysis.',
      },
      )
      .toBeGreaterThan(0);
  }

  async fillJobTitle(jobTitle: string): Promise<void> {
    await this.jobTitleInput.fill(jobTitle);
  }

  async selectNationality(nationality: string): Promise<void> {
    const escapedNationality = nationality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactNationality = new RegExp(`^${escapedNationality}$`, 'i');
    const containsNationality = new RegExp(escapedNationality, 'i');

    await expect(this.nationalityDropdown).toBeVisible({ timeout: 15000 });
    await this.nationalityDropdown.click();

    // Some custom dropdowns render options only after typing into an editable combobox.
    const nationalityTextInput = this.nationalityDropdown.or(this.page.getByRole('combobox')).first();
    if (await nationalityTextInput.isEditable().catch(() => false)) {
      await nationalityTextInput.fill(nationality);
    }

    const roleOption = this.page.getByRole('option', { name: exactNationality }).first();
    if (await roleOption.isVisible().catch(() => false)) {
      await roleOption.click();
      return;
    }

    const roleListItem = this.page.getByRole('listitem', { name: containsNationality }).first();
    if (await roleListItem.isVisible().catch(() => false)) {
      await roleListItem.click();
      return;
    }

    const textOption = this.page.getByText(exactNationality).first();
    if (await textOption.isVisible().catch(() => false)) {
      await textOption.click();
      return;
    }

    // Keyboard fallback for searchable dropdown components that highlight first filtered result.
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  async updateEmail(email: string): Promise<void> {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  async submitCreateAccount(): Promise<void> {
    await this.createMyAccountButton.click();
  }

  async assertSuccessMessage(email: string): Promise<void> {
    await expect(this.signInLinkSuccessMessage).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByText(new RegExp(`we have sent a secured sign-in link to\\s*${email}`, 'i')),
    ).toBeVisible({ timeout: 10000 });
  }
}
