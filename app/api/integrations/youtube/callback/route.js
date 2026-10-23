import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {authenticate} from '../../../../../lib/server-auth';
import {usage} from '../../../../../lib/billing';
import {APP_ORIGIN,seal,unseal,cookieOptions} from '../../../../../lib/metricool-oauth.mjs';
import {YOUTUBE_COOKIE,checkYouTubeState,exchangeYouTube} from '../../../../../lib/youtube-oauth.mjs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){
 const url=new URL(request.url);let outcome='failed';
 try{
  const saved=unseal(cookies().get(YOUTUBE_COOKIE)?.value || '');checkYouTubeState(saved,url.searchParams.get('state'));
  const code=url.searchParams.get('code');if(url.searchParams.has('error') || !code || code.length>4096)throw Error('Authorization declined');
  const auth=await authenticate(saved.accessToken);
  if(auth.user.id!==saved.userId || !(await usage(auth)).owner)throw Error('Owner required');
  const connected=await exchangeYouTube(code);
  const {error}=await auth.client.from('youtube_connections').upsert({user_id:auth.user.id,channel_id:connected.channelId,channel_title:connected.channelTitle,encrypted_tokens:seal(connected.tokens),connected_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error)throw error;outcome='connected';
 }catch{} // Never include codes, secrets, tokens or raw provider errors in the redirect.
 const r=NextResponse.redirect(`${APP_ORIGIN}/publishing-setup?youtube=${outcome}`,303);
 r.headers.set('Cache-Control','private, no-store');r.headers.set('Referrer-Policy','no-referrer');
 r.cookies.set(YOUTUBE_COOKIE,'',{...cookieOptions,maxAge:0});return r;
}
