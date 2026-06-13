import { test, expect } from '@playwright/test';
import { AvuaEmployerPage } from '../pages/AvuaEmployerPage';

const EMAIL = 'pranjil+test@avua.com';
const PASS  = 'Test@123';

test('TC1 - Valid login redirects to dashboard', async ({ page }) => {
  const employer = new AvuaEmployerPage(page);
  await employer.login(EMAIL, PASS);
  await expect(page).toHaveURL(/\/employer\/dashboard/i);
});

test('TC3 - Sign-in is not clickable when email and password are empty', async ({ page }) => {
  await page.goto('/employer-login');
  
  // Switch to Password tab
  const passwordTab = page.getByRole('button', { name: 'Password' }).first();
  await passwordTab.click();

  // Try to click Sign in while fields are empty
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  await expect(signInButton).toBeDisabled();
});

test('TC4 - Success message is shown and OTP is requested when valid email is submitted', async ({ page }) => {
  await page.goto('/employer-login');
  
  // Click One-time code tab
  const otpTab = page.getByRole('button', { name: 'One-time code' }).first();
  await otpTab.click();

  // Enter valid work email in "you@company.com" field
  const emailInput = page.getByPlaceholder('you@company.com');
  await emailInput.fill('pranjil+test@avua.com');

  // Click Send sign-in code button
  const sendCodeBtn = page.getByRole('button', { name: 'Send sign-in code' });
  await sendCodeBtn.click();

  // Verify success message is shown
  await expect(page.getByText('One-time code sent successfully!')).toBeVisible();
  await expect(page.getByText(/We've sent an one-time code to your email/i)).toBeVisible();
});

test('TC5 - Displays user doesnt exist when unregistered email is entered', async ({ page }) => {
  await page.goto('/employer-login');
  
  // Click One-time code tab
  const otpTab = page.getByRole('button', { name: 'One-time code' }).first();
  await otpTab.click();

  // Enter invalid/unregistered email (must have valid format to click button)
  const emailInput = page.getByPlaceholder('you@company.com');
  await emailInput.fill('user@company.com');

  // Click Send sign-in code button
  const sendCodeBtn = page.getByRole('button', { name: 'Send sign-in code' });
  await sendCodeBtn.click();

  // Displays user doesn't exist
  await expect(page.getByText(/user does not exist/i)).toBeVisible();
});

test('TC6 - Send sign-in code button is disabled when email field is empty', async ({ page }) => {
  await page.goto('/employer-login');
  
  // Click One-time code tab
  const otpTab = page.getByRole('button', { name: 'One-time code' }).first();
  await otpTab.click();

  // Leave "you@company.com" field empty
  const emailInput = page.getByPlaceholder('you@company.com');
  await expect(emailInput).toBeEmpty();

  // Verify Send sign-in code button is disabled
  const sendCodeBtn = page.getByRole('button', { name: 'Send sign-in code' });
  await expect(sendCodeBtn).toBeDisabled();
});

test('TC7 - Employer is redirected to forgot password page when clicking Forgot password link', async ({ page }) => {
  await page.goto('/employer-login');
  
  // Click Password tab
  const passwordTab = page.getByRole('button', { name: 'Password' }).first();
  await passwordTab.click();

  // Click "Forgot password?" link (it is rendered as text/button, not an <a> link)
  const forgotPasswordBtn = page.getByText('Forgot password?');
  await forgotPasswordBtn.click();

  // Employer is redirected to forgot password page (rendered within same URL path)
  await expect(page.getByText('Reset password in two quick steps')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset password' })).toBeVisible();
});