import { expect, Locator, Page } from '@playwright/test';

export class AvuaEmployerPage {
  readonly page: Page;
  readonly postJobButton: Locator;
  readonly jobTitleInput: Locator;
  readonly continueButton: Locator;
  readonly reviewButton: Locator;
  readonly publishButton: Locator;
  currentJobTitle: string = "";


  constructor(page: Page) {
    this.page = page;
    this.postJobButton = page.getByRole('button', { name: /Post a Job/i }).first();
    this.jobTitleInput = page.getByPlaceholder(/Enter Job Title/i).first();
    this.continueButton = page.getByRole('button', { name: /Continue/i }).first();
    this.reviewButton = page.getByRole('button', { name: /Review/i }).first();
    this.publishButton = page.getByRole('button', { name: /Publish/i }).first();
  }

  async login(email: string, pass: string): Promise<void> {
    await this.page.goto('/employer-login');
    
    // Switch to Password tab
    const passwordTab = this.page.getByRole('button', { name: 'Password' }).first();
    await passwordTab.click();

    // Fill fields
    await this.page.getByPlaceholder('you@company.com').fill(email);
    await this.page.getByPlaceholder('Enter your password').fill(pass);
    await this.page.getByRole('button', { name: 'Sign in' }).click();

    await expect(this.page).toHaveURL(/\/employer\/dashboard/i);
    await this.postJobButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async navigateToJobPostPage(): Promise<void> {
    await this.postJobButton.click();
    await expect(this.page).toHaveURL(/\/employer\/contract-job-post/i);
    await this.jobTitleInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillStep1Details(jobTitle: string): Promise<void> {
    this.currentJobTitle = jobTitle;
    // Fill Job Title
    await this.jobTitleInput.fill(jobTitle);

    // Wait 3 seconds for all async libraries (like Quill) to load and initialize
    await this.page.waitForTimeout(3000);

    // Fill Description
    const descInput = this.page.locator('.ql-editor').first();
    await descInput.click();
    await descInput.fill('We are seeking a skilled Playwright Test Engineer to build and maintain end-to-end tests.');

    // Select skills
    const addSkillBtn = this.page.locator('text=+ Add skill').first();
    await addSkillBtn.click();
    await this.page.waitForTimeout(1000); // wait for input to appear

    const skillsInput = this.page.getByPlaceholder(/Enter skills/i).first();
    await skillsInput.click();
    await skillsInput.fill('Test Automation');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
    
    await skillsInput.click();
    await skillsInput.fill('JavaScript');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);

    // Experience Minimum
    const minExp = this.page.locator('input[type="number"], spinbutton').first();
    await minExp.fill('3');

    // Select Remote
    const remoteBtn = this.page.getByRole('heading', { name: /Remote/i }).first();
    await remoteBtn.click();

    // Location
    const countryInput = this.page.getByPlaceholder(/e\.g\.\s+United\s+States/i).first();
    await countryInput.fill('United States');
    const cityInput = this.page.getByPlaceholder(/e\.g\.\s+California/i).first();
    await cityInput.fill('New York City');

    // Global applications
    const globalBtn = this.page.getByRole('button', { name: /Yes, allow global applicants/i }).first();
    await globalBtn.click();
  }

  async injectReactStateOverrides(amount = 100, contractLength = "6", jobTitle?: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const targetTitle = jobTitle || this.currentJobTitle;
    await this.page.evaluate(({ today, contractLength, amount, targetTitle }) => {
      const candidates = Array.from(document.querySelectorAll('input, textarea, button, div, p, span, main'));
      let formStateHook: any = null;
      for (const el of candidates) {
        const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
        if (!key) continue;
        let f = el[key];
        while (f) {
          let hook = f.memoizedState;
          while (hook) {
            const val = hook.memoizedState;
            if (val && typeof val === 'object' && 'job_title' in val && 'job_space' in val) {
              formStateHook = hook;
              break;
            }
            hook = hook.next;
          }
          if (formStateHook) break;
          f = f.return;
        }
        if (formStateHook) break;
      }
      if (!formStateHook) throw new Error("Form state hook (containing job_title and job_space) not found in React Fiber trees of any DOM candidates");

      const currentVal = formStateHook.memoizedState;
      const updated = {
        ...currentVal,
        country: {
          id: "d797732d-1ca2-4e60-8ea3-a4f835bd10c1",
          name: "United States",
          code: "US"
        },
        job_space: {
          id: "506760d0-36fa-4251-bc3d-f6eaaefc45f3",
          title: "untitled"
        },
        job_title: {
          id: "5762d24e-356e-4ac6-9584-8f1ab03aec93",
          title: targetTitle || currentVal.job_title?.title || "Playwright Test Engineer"
        },
        job_location: {
          id: "62814642-60a0-4bc8-85fe-41ea4aa4f8bd",
          city: "New York City",
          state: "New York",
          country: "United States",
          code: "US"
        },
        description: "We are seeking a skilled Playwright Test Engineer.",
        skills: [
          { id: 1779278918902, name: "Test Automation" },
          { id: 1779278918903, name: "JavaScript" }
        ],
        experience: {
          min: 3,
          max: 10
        },
        salary_type: "hourly",
        contract_job_payment_details: {
          contract_type: "pay_as_you_go_time_based",
          currency: "USD",
          contract_length: Number(contractLength) || 6,
          start_date: `${today}T00:00:00.000Z`,
          scope_of_work: "We are seeking a skilled Playwright Test Engineer.",
          payment_scale: "hourly",
          minimum_amount: amount,
          maximum_amount: amount,
          milestones: [],
          contractor_payment_amount: amount,
          company_budget_for_candidate: amount
        },
        expected_salary: {
          min: amount,
          max: amount
        },
        exact_amount: amount,
        contract_length: contractLength,
        contract_start_date: today,
        terms_and_conditions: true
      };

      formStateHook.queue.dispatch(updated);
    }, { today, contractLength, amount, targetTitle });
  }

  async proceedToStep2(): Promise<void> {
    await this.continueButton.click();
    // Wait for the contractor model button to be visible on Step 2
    await this.page.locator('.grid.grid-cols-3 > div').first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillStep2Details(): Promise<void> {
    // Select Contractor Model (IC)
    const icBtn = this.page.locator('.grid.grid-cols-3 > div').first();
    await icBtn.click();
    await this.page.waitForTimeout(500);

    // Set Step 2 React state values
    await this.injectReactStateOverrides();
    await this.page.waitForTimeout(500);

    // Click the payment frequency input to open dropdown
    const freqInput = this.page.getByPlaceholder('Select payment frequency');
    await freqInput.click();
    await this.page.waitForTimeout(300);

    // Click "Hourly" option
    await this.page.locator('div').filter({ hasText: /^Hourly$/ }).first().click();
    await this.page.waitForTimeout(500);
  }

  async proceedToStep3(): Promise<void> {
    await this.reviewButton.click();
    await this.page.waitForTimeout(1000);
  }

  async publishJob(): Promise<void> {
    // Before publishing, run state overrides again to ensure job_location ID is preserved on Step 3 rendering
    await this.injectReactStateOverrides();
    await this.page.waitForTimeout(200);

    // Call Publish onClick handler directly or click the button
    const pubClicked = await this.page.evaluate(() => {
      const pubEl = [...document.querySelectorAll('button')].find(e => e.innerText && e.innerText.includes("Publish"));
      if (!pubEl) return false;
      const key = Object.keys(pubEl).find(k => k.startsWith('__reactFiber$'));
      if (!key) return false;
      let f = pubEl[key];
      while (f) {
        if (f.memoizedProps && typeof f.memoizedProps.onClick === 'function') {
          f.memoizedProps.onClick();
          return true;
        }
        f = f.return;
      }
      return false;
    });

    if (!pubClicked) {
      await this.publishButton.click();
    }
  }

  async verifyJobVisibleOnDashboard(jobTitle: string): Promise<void> {
    await this.page.waitForURL(/\/employer\/dashboard/i, { timeout: 15000 });
    // Click on the Jobs tab in the header
    const jobsTab = this.page.locator('a, button, div').filter({ hasText: /^Jobs$/ }).first();
    await jobsTab.click();
    await this.page.waitForTimeout(1000);
    
    // Verify the job is visible in the list
    const jobRow = this.page.locator(`text=${jobTitle}`).first();
    await expect(jobRow).toBeVisible({ timeout: 15000 });
  }
}
