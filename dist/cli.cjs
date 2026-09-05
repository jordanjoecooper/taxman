#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const Taxman = require('./engine.js');
try {
  if (process.argv.includes('--help')) {
    console.log('Taxman offline UK tax calculator\nUsage: node cli.cjs < input.json\n       node cli.cjs --file input.json\nInput: calculator object, or {"baseline": {...}, "changes": {...}} for comparison.\nSee API.md for fields. Output: JSON to stdout; errors: JSON to stderr, exit 1.');
  } else {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--file')) throw new Error('Use --file PATH or JSON on stdin.');
    const input = JSON.parse(fs.readFileSync(args.length ? args[1] : 0, 'utf8'));
    const result = Object.hasOwn(input, 'baseline') ? Taxman.compare(input.baseline, input.changes || {}) : Taxman.calculate(input);
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; }
