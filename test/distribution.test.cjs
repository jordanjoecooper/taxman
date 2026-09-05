'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync,spawnSync} = require('node:child_process');
const path = require('node:path');
const root=path.resolve(__dirname,'..');

test('build emits standalone HTML with no remote rendering assets', () => {
  execFileSync(process.execPath,['scripts/build.cjs'],{cwd:root});
  const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  assert.doesNotMatch(html,/<script[^>]+src=/i); assert.doesNotMatch(html,/<link[^>]+rel="stylesheet"/i); assert.doesNotMatch(html,/@import|url\(https?:/i);
  assert.equal(fs.readFileSync(path.join(root,'dist/taxman-offline.html'),'utf8'),html);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,3); new vm.Script(scripts[0]); new vm.Script(scripts[2]);
  const context={}; vm.runInNewContext(scripts[0],context); assert.equal(context.Taxman.calculate().annual.takeHome,39519.6);
  const schema=JSON.parse(fs.readFileSync(path.join(root,'dist/input.schema.json'),'utf8'));
  assert.deepEqual(Object.keys(schema.properties).sort(),Object.keys(context.Taxman.defaults).sort());
  assert.equal(JSON.parse(execFileSync(process.execPath,['dist/cli.cjs'],{cwd:root,input:'{"income":50000}',encoding:'utf8'})).annual.takeHome,39519.6);
});
test('CLI compares valid JSON, rejects invalid input and emits parseable errors', () => {
  const good=spawnSync(process.execPath,['cli.cjs'],{cwd:root,input:JSON.stringify({baseline:{income:60000},changes:{pensionMethod:'salary-sacrifice',pension:6000}}),encoding:'utf8'});
  assert.equal(good.status,0); assert.equal(JSON.parse(good.stdout).difference.totalPension,6000);
  for (const input of ['{','{"income":-1}','{"income":"100"}']) {
    const bad=spawnSync(process.execPath,['cli.cjs'],{cwd:root,input,encoding:'utf8'}); assert.equal(bad.status,1); assert.ok(JSON.parse(bad.stderr).error); assert.equal(bad.stdout,'');
  }
});
