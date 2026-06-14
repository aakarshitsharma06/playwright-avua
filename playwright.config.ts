import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: !process.env.RENDER,
  workers: process.env.RENDER ? 1 : undefined,
  timeout: 60000,
  retries: 1,
  reporter: [
    ['html'],
    ['./utils/jiraReporter.ts']
  ],
  use: {
    baseURL: 'https://avua.com',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1920, height: 1080 },
  },
});
