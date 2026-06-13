const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const testsDir = path.join(__dirname, '..', 'tests');
const registryFile = path.join(__dirname, '..', 'test-registry.json');

function extractTitles(content) {
  const titles = [];
  
  // Match test('Title', ...) or test("Title", ...) or test(`Title`, ...)
  const testRegex = /test(?:\.describe)?\s*\(\s*(['"`])(.*?)\1\s*,/g;
  let match;
  while ((match = testRegex.exec(content)) !== null) {
    titles.push(match[2]);
  }
  
  return titles;
}

function generateRegistry() {
  const files = fs.readdirSync(testsDir).filter(file => file.endsWith('.spec.ts') || file.endsWith('.spec.js') || file.endsWith('.test.ts') || file.endsWith('.test.js'));
  
  const registry = [];

  for (const file of files) {
    const specPath = `tests/${file}`;
    const absolutePath = path.join(testsDir, file);
    const content = fs.readFileSync(absolutePath, 'utf8');
    
    const titles = extractTitles(content);
    if (titles.length === 0) continue;

    // Add file-level entry (runs all tests in the file)
    registry.push({
      id: crypto.createHash('md5').update(specPath).digest('hex').substring(0, 8),
      description: `FILE-LEVEL TEST: Runs ALL tests inside ${file}. Tests included: ${titles.join(', ')}.`,
      specPath,
      grep: null
    });

    // Add specific test-level entries
    for (const title of titles) {
      registry.push({
        id: crypto.createHash('md5').update(`${specPath}:${title}`).digest('hex').substring(0, 8),
        description: `SPECIFIC TEST CASE: "${title}". Use this to run ONLY this specific test.`,
        specPath,
        grep: title
      });
    }
  }

  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));
  console.log(`Generated registry with ${registry.length} test files at test-registry.json`);
}

generateRegistry();
