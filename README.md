# Playwright Automation

This repository contains automated tests using Playwright.

## Natural Language Testbot

This project includes an experimental AI-powered chatbot that allows non-technical team members to run Playwright tests using natural language.

> **WARNING:** This chatbot allows executing shell commands (`npx playwright test`) triggered via a web interface. Even though it restricts execution to known specs, this should strictly be used in a protected internal staging/test environment and NEVER exposed to the public internet or production.

### Setup
1. Run `npm install`
2. Copy `.env.example` to `.env` and fill in your `ANTHROPIC_API_KEY` and a secure `BOT_PASSWORD`.
3. Generate the test registry (this creates `test-registry.json` by scanning your test files):
   ```bash
   npm run generate-registry
   ```
4. Start the Testbot server:
   ```bash
   npm run start:testbot
   ```
5. Open `http://localhost:3000` in your browser.
6. Enter the `BOT_PASSWORD` in the top right corner.
7. Type a natural language request, like *"test the employer job post flow"*.
8. The bot will match it to the correct test, run Playwright in the background, and provide a plain-English summary of the results!
