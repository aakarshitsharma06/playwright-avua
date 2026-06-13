require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/test-results', express.static(path.join(__dirname, 'test-results')));

let isRunning = false;
let currentResult = { status: 'idle', test: null, summary: null, timestamp: Date.now(), screenshots: [] };
const queue = [];
const chatHistory = [];

async function callGemini(systemPrompt, history, maxTokens = 500) {
  const body = {
    contents: history,
    generationConfig: { maxOutputTokens: maxTokens }
  };
  
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function runTest(testDef) {
  currentResult = { status: 'running', test: testDef.description, summary: null, timestamp: Date.now(), screenshots: [] };
  
  return new Promise((resolve) => {
    const reportFile = path.join(__dirname, 'playwright-report', 'chatbot-report.json');
    process.env.PLAYWRIGHT_JSON_OUTPUT_NAME = reportFile;
    
    console.log(`Running test: ${testDef.specPath}${testDef.grep ? ` (grep: ${testDef.grep})` : ''}`);
    broadcastLog(`\n> Starting test execution: ${testDef.specPath}${testDef.grep ? ` (Filter: ${testDef.grep})` : ''}...\n`);
    
    const args = ['playwright', 'test', testDef.specPath, '--reporter=list,json'];
    if (testDef.grep) {
      args.push('-g', testDef.grep);
    }
    const child = spawn('npx', args, { env: { ...process.env, FORCE_COLOR: '0' } });

    child.stdout.on('data', (data) => {
      console.log(data.toString());
      broadcastLog(data.toString());
    });
    
    child.stderr.on('data', (data) => {
      console.error(data.toString());
      broadcastLog(data.toString());
    });

    child.on('close', async (code) => {
      broadcastLog(`\n> Test execution completed (code ${code}). Generating AI summary...\n`);
      
      let testResults = {};
      let screenshots = [];
      try {
        if (fs.existsSync(reportFile)) {
          testResults = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
          
          if (testResults.suites) {
            function findScreenshots(suites) {
              for (const suite of suites) {
                if (suite.specs) {
                  for (const spec of suite.specs) {
                    if (spec.tests) {
                      for (const test of spec.tests) {
                        if (test.results) {
                          for (const res of test.results) {
                            if (res.attachments) {
                              for (const att of res.attachments) {
                                if (att.contentType && att.contentType.startsWith('image/') && att.path) {
                                  const relativePath = path.relative(path.join(__dirname, 'test-results'), att.path);
                                  screenshots.push({
                                    url: `/test-results/${relativePath.split(path.sep).join('/')}`,
                                    title: spec.title
                                  });
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                if (suite.suites) {
                  findScreenshots(suite.suites);
                }
              }
            }
            findScreenshots(testResults.suites);
          }
        } else {
          testResults = { error: 'No report generated' };
        }
      } catch (e) {
        testResults = { error: 'Could not parse test results' };
      }

      console.log('Generating summary...');
      const summaryPrompt = `You are a test-summarization assistant. Review this Playwright JSON test output and provide a concise, plain-English summary for a non-technical stakeholder (like a CEO). Include pass/fail counts and explain failures simply without code jargon.

Test run output: ${JSON.stringify(testResults).substring(0, 20000)}`;

      try {
        const summaryText = await callGemini(undefined, [{ role: 'user', parts: [{ text: summaryPrompt }] }], 1000);
        currentResult = { status: 'completed', test: testDef.description, summary: summaryText, timestamp: Date.now(), screenshots };
        chatHistory.push({ role: 'model', parts: [{ text: `Test Result Summary for ${testDef.description}:\n\n${summaryText}` }] });
      } catch (e) {
        console.error('Summary generation failed:', e);
        currentResult = { status: 'completed', test: testDef.description, summary: `The test finished but summary generation failed: ${e.message}`, timestamp: Date.now(), screenshots };
      }
      
      resolve();
    });
  });
}

function broadcastLog(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function processQueue() {
  if (isRunning || queue.length === 0) return;
  isRunning = true;
  const task = queue.shift();
  runTest(task).finally(() => {
    isRunning = false;
    processQueue();
  });
}

app.post('/chat', async (req, res) => {
  const { message, password } = req.body;
  
  if (password !== process.env.BOT_PASSWORD) {
    return res.status(403).json({ error: 'Invalid password. Please check your credentials.' });
  }

  try {
    let registry;
    try {
      registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-registry.json'), 'utf8'));
    } catch (e) {
      return res.status(500).json({ error: 'Test registry not found. Please run the generation script first.' });
    }

    const systemPrompt = `You are a conversational AI test automation assistant.
Here is the test registry:
${JSON.stringify(registry, null, 2)}
The current status of the test runner is: ${JSON.stringify({ status: currentResult.status, test: currentResult.test })}

If the user explicitly asks to run a test from the registry, reply ONLY with a JSON object: {"action": "RUN_TEST", "test": {"id": "...", "description": "...", "specPath": "...", "grep": "..."}}
If the user is asking a question, following up on a past test, or checking status, reply normally in plain English text.
DO NOT output JSON unless you intend to trigger a test execution right now.`;

    chatHistory.push({ role: 'user', parts: [{ text: message }] });
    const textResp = await callGemini(systemPrompt, chatHistory, 800);
    chatHistory.push({ role: 'model', parts: [{ text: textResp }] });
    
    let match;
    try {
      const jsonMatch = textResp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action === 'RUN_TEST' && parsed.test) {
          match = parsed.test;
        }
      }
    } catch (e) { }

    if (match && match.specPath) {
      queue.push(match);
      processQueue();
      // Replace the raw JSON history with a clean memory
      chatHistory[chatHistory.length - 1].parts[0].text = `I have queued the test: ${match.description}`;
      return res.json({ message: `I found a matching test: **${match.description}**\n\nI have queued this to run. Please wait a moment while I execute the tests and analyze the results...` });
    }

    return res.json({ message: textResp });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error while processing request.' });
  }
});

app.get('/result', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json(currentResult);
});

const server = app.listen(PORT, () => {
  console.log(`Testbot server is running on http://localhost:${PORT}`);
  console.log(`WARNING: This internal chatbot allows test execution. Only deploy in secure, staging/internal environments.`);
});

const wss = new WebSocket.Server({ server });
