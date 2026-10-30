import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import config from '../lib/deployment-config.cjs';
import {socialAuthorization, exchangeSocial} from '../lib/social-oauth.mjs';
import {freshTiktokTokens} from '../lib/tiktok-connection.mjs';

const sandbox = {MUSIC_APP_ENV:'sandbox', MUSIC_SANDBOX_ORIGIN:'https://music-tiktok-test.vercel.app', NEXT_PUBLIC_SUPABASE_URL:'https://isolated-test.supabase.co', TIKTOK_SANDBOX_CLIENT_KEY:'sandbox-key', TIKTOK_SANDBOX_CLIENT_SECRET:'sandbox-secret'};
test('production origin and credential names stay unchanged', () => {
  assert.equal(config.applicationOrigin({}), config.PRODUCTION_ORIGIN);
  assert.deepEqual(config.tiktokCredentials({TIKTOK_CLIENT_KEY:'prod',TIKTOK_CLIENT_SECRET:'secret'}), {id:'prod',secret:'secret'});
});
test('sandbox rejects the production database, website and inherited credentials', () => {
  assert.equal(config.applicationOrigin(sandbox), sandbox.MUSIC_SANDBOX_ORIGIN);
  for (const change of [
    {NEXT_PUBLIC_SUPABASE_URL:'https://eycvgtlrvjrmduejqplb.supabase.co'},
    {MUSIC_SANDBOX_ORIGIN:config.PRODUCTION_ORIGIN},
    {MUSIC_SANDBOX_ORIGIN:sandbox.MUSIC_SANDBOX_ORIGIN+'/'},
    {MUSIC_SANDBOX_ORIGIN:'https://user:password@music-tiktok-test.vercel.app'},
    {NEXT_PUBLIC_SUPABASE_URL:'https://other.example.com'},
    {TIKTOK_CLIENT_KEY:'prod'}, {FACEBOOK_APP_SECRET:'prod'}, {YOUTUBE_CLIENT_SECRET:'prod'},
    {STRIPE_SECRET_KEY:'sk_live_example'}, {BILLING_BRIDGE_TOKEN:'prod'}, {BILLING_MODE:'live'}
  ]) assert.throws(() => config.applicationOrigin({...sandbox,...change}));
});
test('preview requires explicit sandbox mode and unknown modes are rejected', () => {
  assert.throws(() => config.applicationOrigin({VERCEL_ENV:'preview'}));
  assert.throws(() => config.applicationOrigin({MUSIC_APP_ENV:'sandobx'}));
  assert.equal(config.applicationOrigin({...sandbox,VERCEL_ENV:'preview'}),sandbox.MUSIC_SANDBOX_ORIGIN);
});
test('sandbox authorization and exchange use the same isolated callback and credentials', async () => {
  const authorization=socialAuthorization('tiktok','test-user','session',sandbox);
  const url=new URL(authorization.url), callback=sandbox.MUSIC_SANDBOX_ORIGIN+'/api/integrations/social/tiktok/callback';
  assert.equal(url.searchParams.get('client_key'),'sandbox-key');
  assert.equal(url.searchParams.get('redirect_uri'),callback);
  assert.equal(url.searchParams.get('scope'),'user.info.basic,video.publish');
  await exchangeSocial('tiktok','code',async (url,options) => {
    if(url.includes('/token/')) {
      assert.equal(options.body.get('client_key'),'sandbox-key');
      assert.equal(options.body.get('client_secret'),'sandbox-secret');
      assert.equal(options.body.get('redirect_uri'),callback);
      return Response.json({access_token:'a',refresh_token:'r',open_id:'test',expires_in:3600,scope:'user.info.basic,video.publish'});
    }
    return Response.json({data:{user:{open_id:'test',display_name:'Test'}}});
  },sandbox);
  assert.throws(() => socialAuthorization('facebook','test','session',sandbox));
});
test('sandbox refresh uses only sandbox keys and never falls back to production', async () => {
  const tokens={refresh_token:'r',expires_at:0};let calls=0;
  const request=async (url,options) => {
    calls++;assert.equal(options.body.get('client_key'),'sandbox-key');assert.equal(options.body.get('client_secret'),'sandbox-secret');
    return Response.json({access_token:'a',refresh_token:'r2',open_id:'test',expires_in:3600,scope:'user.info.basic,video.publish'});
  };
  await freshTiktokTokens(tokens,'test',request,sandbox);
  await assert.rejects(freshTiktokTokens(tokens,'test',request,{MUSIC_APP_ENV:'sandbox',TIKTOK_CLIENT_KEY:'prod',TIKTOK_CLIENT_SECRET:'prod'}));
  assert.equal(calls,1);
});
test('build config and runtime imports both reject a sandbox pointed at production', () => {
  const env={PATH:process.env.PATH,...sandbox,NEXT_PUBLIC_SUPABASE_URL:'https://eycvgtlrvjrmduejqplb.supabase.co'};
  for(const args of [['-e',"require('./next.config.js')"],['--input-type=module','-e',"import './lib/metricool-oauth.mjs'"]]) {
    const result=spawnSync(process.execPath,args,{cwd:new URL('..',import.meta.url),env,encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,/Production database access is forbidden/);
    assert.doesNotMatch(result.stderr,/sandbox-secret/);
  }
});

test('Sandbox-specific YouTube configuration preserves production credential rejection',()=>{
 const isolated={...sandbox,YOUTUBE_SANDBOX_CLIENT_ID:'test-client',YOUTUBE_SANDBOX_CLIENT_SECRET:'test-secret'};
 assert.equal(config.applicationOrigin(isolated),sandbox.MUSIC_SANDBOX_ORIGIN);
 assert.throws(()=>config.applicationOrigin({...isolated,YOUTUBE_CLIENT_ID:'production-client'}));
});
