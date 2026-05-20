import { test } from '@playwright/test';
import { AvuaSignUpPage } from '../pages/AvuaSignUpPage';

test.describe('Applicant Sign-Up Flow', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `screenshots/${testInfo.title.replace(/\s+/g, '_')}.png`,
        fullPage: true,
      });
    }
  });

  test('should sign up applicant via resume upload and AI-prefilled form', async ({ page }) => {
    const signUpPage = new AvuaSignUpPage(page);
    const email = 'theaakarshit+2027@gmail.com';

    await signUpPage.goToApplicantSignUpPage();
    await signUpPage.uploadResume('./fixtures/resume.pdf');
    await signUpPage.waitForAiPrefill();
    await signUpPage.fillJobTitle('iOS Developer');
    await signUpPage.selectNationality('Indian');
    await signUpPage.updateEmail(email);
    await signUpPage.submitCreateAccount();
    await signUpPage.assertSuccessMessage(email);
  });
});
