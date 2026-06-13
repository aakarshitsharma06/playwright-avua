# Testbot Deployment Guide

This guide contains step-by-step instructions for deploying the Playwright AI Testbot to Render.com so that the entire team can access it via a public URL.

## Prerequisites
- Access to the GitHub repository.
- A free or paid account on [Render.com](https://render.com).
- The `GEMINI_API_KEY` and the `BOT_PASSWORD`.

## Why Render?
Because Playwright requires actual browser engines (Chromium, Firefox, WebKit) and specific Linux OS dependencies to run tests, we cannot use basic hosting providers like Vercel or Netlify. We must use a provider that supports **Docker** deployments. The included `Dockerfile` automatically pulls the official Microsoft Playwright image and configures the environment.

---

## Step 1: Create a New Web Service
1. Log into your Render dashboard.
2. Click **"New +"** in the top right and select **"Web Service"**.
3. Connect your GitHub account and select this repository (`playwright-avua`).
4. **Important**: Under the branch settings, make sure to select the `chatBot` branch (or `main` if the chatBot branch has already been merged).

## Step 2: Configure the Deployment
Render should automatically detect the `Dockerfile` at the root of the repository. Verify the following settings:
- **Environment**: `Docker`
- **Region**: Pick the region closest to the majority of your team.
- **Instance Type**: 
  - *Recommendation*: Since Playwright launches real headless browsers, it is memory intensive. The Free tier (512MB RAM) may occasionally crash when running heavy UI tests in parallel. It is highly recommended to use the **Starter tier ($7/mo)** or **Standard tier ($15/mo - 2GB RAM)** for stability.

## Step 3: Add Environment Variables
Scroll down to the **Environment Variables** section and click "Add Environment Variable". You must add these exactly:

1. `GEMINI_API_KEY`
   - **Value**: *(Provide the valid Gemini API key here)*
2. `BOT_PASSWORD`
   - **Value**: *(Set a strong password. This is required to access the testbot UI).*

## Step 4: Deploy
1. Click **"Create Web Service"**.
2. Render will begin pulling the code, building the Docker image, and starting the Express server. The initial build usually takes about 3-5 minutes as it downloads the browser binaries.
3. Once the deployment logs indicate "Live", Render will assign a public URL (e.g., `https://playwright-avua.onrender.com`).

## Step 5: Verify
Visit the public URL in your browser. You should be greeted by the Avua Testbot login screen. Enter the `BOT_PASSWORD` you configured, and try asking it to run a test!

---

## Troubleshooting
- **Tests hanging or crashing**: If the Render logs show "Out of Memory" (OOM) errors, the server does not have enough RAM to run the Playwright browsers. Upgrade the Render instance type.
- **AI Summary Failing**: If you encounter a `429 Quota Exceeded` error in the logs, you have hit the Gemini API rate limit. Ensure the model in `server.js` is set to `gemini-flash-lite-latest` or upgrade your Google AI Studio billing plan.
