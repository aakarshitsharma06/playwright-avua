import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Ensure .env is loaded
dotenv.config();

export default class JiraReporter implements Reporter {
  async onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'failed' && result.status !== 'timedOut') {
      return;
    }

    if (process.env.CREATE_JIRA_TICKETS !== 'true') {
      console.log(`\n[JiraReporter] Test failed: "${test.title}". Skipping Jira ticket creation because CREATE_JIRA_TICKETS is not 'true'.`);
      return;
    }

    const jiraUrl = process.env.JIRA_URL;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;
    const projectKey = process.env.JIRA_PROJECT_KEY;

    if (!jiraUrl || !jiraEmail || !jiraToken || !projectKey) {
      console.error('\n[JiraReporter] Missing Jira environment variables. Cannot create ticket.');
      return;
    }

    console.log(`\n[JiraReporter] Attempting to create Jira ticket for failed test: "${test.title}"...`);

    const authHeader = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    
    // Format error message safely, truncating if too long
    let errorMessage = result.error?.message || 'No error message provided';
    if (errorMessage.length > 5000) {
      errorMessage = errorMessage.substring(0, 5000) + '... [Truncated]';
    }

    const payload = {
      fields: {
        project: {
          key: projectKey,
        },
        summary: `[Automated Test Failure] ${test.title}`,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `The automated Playwright test "${test.title}" failed during execution.\n\nFile: ${test.location.file}:${test.location.line}\n\nError Log:\n`
                }
              ]
            },
            {
              type: "codeBlock",
              content: [
                {
                  type: "text",
                  text: errorMessage
                }
              ]
            }
          ]
        },
        issuetype: {
          name: "Bug",
        },
      },
    };

    try {
      const response = await axios.post(
        `${jiraUrl.replace(/\/$/, '')}/rest/api/3/issue`,
        payload,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`[JiraReporter] ✅ Successfully created Jira ticket: ${response.data.key} (${jiraUrl}/browse/${response.data.key})`);
    } catch (error: any) {
      console.error(`[JiraReporter] ❌ Failed to create Jira ticket.`);
      if (error.response) {
        console.error('Jira API Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error(error.message);
      }
    }
  }
}
