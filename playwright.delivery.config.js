import { defineConfig } from '@playwright/test';
import source from './playwright.config.js';
export default defineConfig({
  testDir: 'delivery-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  projects: source.projects,
  timeout: 60000
});
