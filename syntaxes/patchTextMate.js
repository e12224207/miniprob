import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.resolve(__dirname, '.', 'mini-prob.tmLanguage.json');

// Read and parse the existing grammar file
const raw = readFileSync(filePath, 'utf-8');
const grammar = JSON.parse(raw);

// Highlighting rules to inject.
const rulesToInject = [
  {
    name: 'storage.type.int-prefix.mini-prob',
    match: '\\b[su][1-9][0-9]*\\b',
  },
  {
    name: 'keyword.control.boolValue.mini-prob',
    match: '\\b(true|false)\\b',
  },
];

let changesMade = false;

rulesToInject.forEach((rule) => {
  const ruleExists = grammar.patterns.some((p) => p.name === rule.name && p.match === rule.match);
  if (!ruleExists) {
    grammar.patterns.push(rule);
    console.log(`✅ Added ${rule.name} pattern to mini-prob.tmLanguage.json`);
    changesMade = true;
  } else {
    console.log(`ℹ️ ${rule.name} pattern already exists. No changes made.`);
  }
});

// Write the updated grammar file if any new rule was added.
if (changesMade) {
  writeFileSync(filePath, JSON.stringify(grammar, null, 2), 'utf-8');
}
