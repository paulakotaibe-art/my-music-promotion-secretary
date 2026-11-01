import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {rootDocumentationOnly,shouldIgnore}=require('../scripts/ignore-documentation-build.cjs');
test('build skipping accepts only root Markdown; runtime, config, public assets and unknown diffs still build',()=>{
 assert.equal(rootDocumentationOnly(['PROJECT_COMPLETION.md','SUPPORT_OPERATIONS.md']),true);
 for(const files of [[],['app/page.js'],['README.md','package.json'],['public/guide.md'],['docs/guide.md'],['vercel.json']])assert.equal(rootDocumentationOnly(files),false);
 assert.equal(shouldIgnore({}),false);
 assert.equal(shouldIgnore({VERCEL_GIT_PREVIOUS_SHA:'invalid',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)}),false);
});
test('a documentation commit after an undeployed code change cannot skip that pending code',()=>{
 const dir=mkdtempSync(join(tmpdir(),'music-build-check-'));
 const git=(...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const commit=()=>{git('add','.');git('-c','user.name=Local Fixture','-c','user.email=fixture@local.invalid','commit','-qm','fixture');return git('rev-parse','HEAD');};
 try{
  git('init','-q');writeFileSync(join(dir,'app.js'),'baseline');const deployed=commit();
  writeFileSync(join(dir,'PROJECT_COMPLETION.md'),'docs');const docs=commit();
  assert.equal(shouldIgnore({VERCEL_GIT_PREVIOUS_SHA:deployed,VERCEL_GIT_COMMIT_SHA:docs},dir),true);
  writeFileSync(join(dir,'app.js'),'pending code');commit();
  writeFileSync(join(dir,'PROJECT_COMPLETION.md'),'more docs');const latest=commit();
  assert.equal(shouldIgnore({VERCEL_GIT_PREVIOUS_SHA:deployed,VERCEL_GIT_COMMIT_SHA:latest},dir),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('missing history always builds rather than hiding an unverified deployment',()=>{
 const dir=mkdtempSync(join(tmpdir(),'music-empty-history-'));
 try{assert.equal(shouldIgnore({VERCEL_GIT_PREVIOUS_SHA:'a'.repeat(40),VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)},dir),false);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
