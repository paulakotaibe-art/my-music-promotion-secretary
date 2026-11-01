import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';

const require=createRequire(import.meta.url);
const source=await readFile(new URL('../app/components/AccountSessionBoundary.js',import.meta.url),'utf8');
const bundle=await build({
 stdin:{contents:source,resolveDir:fileURLToPath(new URL('../app/components',import.meta.url)),sourcefile:'AccountSessionBoundary.js',loader:'jsx'},
 bundle:true,write:false,jsx:'automatic',format:'cjs',platform:'node',external:['react'],
 plugins:[{name:'fixture-auth',setup(builder){
  builder.onResolve({filter:/supabaseClient$/},()=>({path:'auth',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const supabase = globalThis.__musicSessionFixture;'}));
 }}]
});
function fixture(path='/dashboard'){
 const originalWindow=globalThis.window,originalClient=globalThis.__musicSessionFixture;
 let callback,unsubscribed=false,tree;
 const destinations=[];
 globalThis.window={location:{pathname:path,replace:target=>destinations.push(target)}};
 globalThis.__musicSessionFixture={auth:{
  getSession(){throw Error('Auth callback must stay synchronous');},
  onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){unsubscribed=true;callback=null;}}}};}
 }};
 const mod={exports:{}};
 new Function('require','module','exports',bundle.outputFiles[0].text)(require,mod,mod.exports);
 const Boundary=mod.exports.default;
 act(()=>{tree=TestRenderer.create(React.createElement(Boundary,null,React.createElement('p',null,'Fixture account data')));});
 return {
  emit(event,id){act(()=>callback(event,id?{user:{id}}:null));},
  text(){return JSON.stringify(tree.toJSON());},
  destinations,
  close(){act(()=>tree.unmount());globalThis.window=originalWindow;globalThis.__musicSessionFixture=originalClient;assert.equal(unsubscribed,true);}
 };
}
test('mounted boundary preserves the same account across refresh and repeated sign-in',()=>{
 const f=fixture();
 try{
  f.emit('INITIAL_SESSION','one');f.emit('TOKEN_REFRESHED','one');f.emit('SIGNED_IN','one');
  assert.match(f.text(),/Fixture account data/);assert.deepEqual(f.destinations,[]);
 }finally{f.close();}
});
test('mounted boundary removes protected content on sign-out and redirects to sign-in',()=>{
 const f=fixture('/youtube-test');
 try{
  f.emit('INITIAL_SESSION','one');f.emit('SIGNED_OUT');
  assert.doesNotMatch(f.text(),/Fixture account data/);assert.match(f.text(),/Returning to sign-in/);
  assert.deepEqual(f.destinations,['/login']);
 }finally{f.close();}
});
test('mounted boundary removes the previous account before showing another account',()=>{
 const f=fixture('/social-connections');
 try{
  f.emit('INITIAL_SESSION','one');f.emit('SIGNED_IN','two');
  assert.doesNotMatch(f.text(),/Fixture account data/);assert.deepEqual(f.destinations,['/login']);
 }finally{f.close();}
});
test('public support remains readable after sign-out and auth listener is cleaned up',()=>{
 const f=fixture('/support');
 try{
  f.emit('INITIAL_SESSION','one');f.emit('SIGNED_OUT');
  assert.match(f.text(),/Fixture account data/);assert.deepEqual(f.destinations,[]);
 }finally{f.close();}
});
