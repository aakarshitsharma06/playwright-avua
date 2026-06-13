import { test } from '@playwright/test';
import { AvuaEmployerPage } from '../pages/AvuaEmployerPage';

test.describe('Employer Job Posting Flow', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `screenshots/${testInfo.title.replace(/\s+/g, '_')}.png`,
        fullPage: true,
      });
    }
  });

  test('should successfully post a contract job as an employer', async ({ page }) => {
    const employerPage = new AvuaEmployerPage(page);
    const email = 'pranjil+test@avua.com';
    const password = 'Test@123';
    const jobTitle = `Playwright Test Engineer ${Date.now()}`;
    console.log('--- STARTING TEST ---');

    // Step 1: Login
    console.log('Step 1: Logging in...');
    await employerPage.login(email, password);

    // Step 2: Navigate to post job
    console.log('Step 2: Navigating to job post page...');
    await employerPage.navigateToJobPostPage();

    // Step 3: Fill Step 1 Details
    console.log(`Step 3: Filling Step 1 details with job title: "${jobTitle}"...`);
    await employerPage.fillStep1Details(jobTitle);

    // Step 4: Inject React overrides for Step 1
    console.log('Step 4: Injecting React state overrides...');
    await employerPage.injectReactStateOverrides();

    // Step 5: Proceed to Step 2
    console.log('Step 5: Proceeding to Step 2...');
    await employerPage.proceedToStep2();

    // Step 6: Fill Step 2 Details
    console.log('Step 6: Filling Step 2 details...');
    await employerPage.fillStep2Details();

    // Step 7: Proceed to Step 3 (Review & Publish)
    console.log('Step 7: Proceeding to Step 3...');
    await employerPage.proceedToStep3();

    // Step 8: Publish Job
    console.log('Step 8: Publishing job...');
    await employerPage.publishJob();

    // Step 9: Verify Redirect and Job visibility on Dashboard
    console.log('Step 9: Verifying job on dashboard...');
    await employerPage.verifyJobVisibleOnDashboard(jobTitle);
    console.log('--- TEST FINISHED SUCCESSFULLY ---');
  });
});
