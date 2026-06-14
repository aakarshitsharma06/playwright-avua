# Auto-Create Jira Tickets (Playwright Integration)

This project includes a **Universal Jira Reporter** (`utils/jiraReporter.ts`). Whenever a Playwright test fails—whether it's run locally by a developer, triggered via the Testbot UI, or executed in a GitHub Actions CI/CD pipeline—the reporter will securely intercept the error and automatically create a Bug ticket in your Jira workspace.

## Step 1: Generate a Jira API Token
To allow the reporter to create tickets on your behalf, you need to generate a secure API token from your Atlassian account.

1. Log in to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Click **Create API token**.
3. Give it a memorable label (e.g., `Playwright Testbot`).
4. Copy the generated token immediately (you will not be able to see it again).

## Step 2: Configure Environment Variables
Open the `.env` file in the root of the project. You must fill in all of the following variables for the integration to work:

```env
# The base URL of your Jira workspace (no trailing slash)
JIRA_URL=https://your-company.atlassian.net

# The email address associated with the API Token you just created
JIRA_EMAIL=your-email@company.com

# The API Token you copied in Step 1
JIRA_API_TOKEN=your_copied_api_token_here

# The exact Project Key where you want the bugs to be created. 
# For example, if your tickets are named "BUG-123", the key is "BUG".
JIRA_PROJECT_KEY=BUG

# The master switch to enable/disable ticket creation (see Step 3)
CREATE_JIRA_TICKETS=true
```

## Step 3: Managing Jira Spam (The Master Switch)
When developers are actively writing or debugging new Playwright tests on their local laptops, the tests will fail frequently. To prevent these localized failures from creating hundreds of spam tickets on your Jira board, we implemented the `CREATE_JIRA_TICKETS` toggle.

- **Local Development:** Developers should keep `CREATE_JIRA_TICKETS=false` in their local `.env` file while working.
- **Testbot (AWS/Render):** You should set `CREATE_JIRA_TICKETS=true` in the cloud environment settings for the Testbot.
- **GitHub Actions (CI/CD):** If you run regression tests on Pull Requests, add `CREATE_JIRA_TICKETS=true` to your GitHub Repository Secrets and inject it into the workflow file.

## How it works
Once configured, the custom reporter automatically parses the `onTestEnd` event in Playwright. If the status is `failed` or `timedOut`, it constructs a rich Atlassian Document Format (ADF) payload containing:
1. The exact title of the failed test case.
2. The exact file path and line number where it failed.
3. A formatted code block containing the stack trace and error message from Playwright.

It then authenticates using Basic Auth (Email + API Token) and POSTs the payload to Jira's `v3/issue` endpoint.
