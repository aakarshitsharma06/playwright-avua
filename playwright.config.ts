import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  retries: 1,
  reporter: [['html']],
  use: {
    baseURL: 'https://avua.com',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
