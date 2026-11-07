import {randomBytes} from 'node:crypto';
import deploymentConfig from './deployment-config.cjs';
import {APP_ORIGIN,validateState} from './metricool-oauth.mjs';
export const YOUTUBE_CALLBACK=`${APP_ORIGIN}/api/integrations/youtube/callback`;
export const YOUTUBE_COOKIE='__Host-music-youtube';
export const YOUTUBE_SCOPES=['https://www.googleapis.com/auth/youtube.upload','https://www.googleapis.com/auth/youtube.readonly'];
export function youtubeConfig(env=process.env){
 const prefix=deploymentConfig.sandboxMode(env)?'YOUTUBE_SANDBOX_CLIENT_':'YOUTUBE_CLIENT_';
 const clientId=env[prefix+'ID']?.trim(),clientSecret=env[prefix+'SECRET']?.trim();
 if(!clientId || !clientSecret)throw Error('YouTube developer credentials are not configured.');
 return {clientId,clientSecret};
}
export function youtubeConfigured(env=process.env){
 try{youtubeConfig(env);return true;}catch{return false;}
}
export function youtubeAuthorization(userId,accessToken,env=process.env){
 const {clientId}=youtubeConfig(env),state=randomBytes(32).toString('base64url');
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 Object.entries({client_id:clientId,redirect_uri:YOUTUBE_CALLBACK,response_type:'code',scope:YOUTUBE_SCOPES.join(' '),access_type:'offline',prompt:'consent',state}).forEach(([k,v])=>url.searchParams.set(k,v));
 return {url:url.href,state:{provider:'youtube',userId,accessToken,state,expires:Date.now()+600000}};
}
export function checkYouTubeState(saved,state){if(saved.provider!=='youtube')throw Error('Wrong authorization provider');validateState(saved,state);}
export async function exchangeYouTube(code,request=fetch,env=process.env){
 const {clientId,clientSecret}=youtubeConfig(env);
 const r=await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,grant_type:'authorization_code',redirect_uri:YOUTUBE_CALLBACK}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('YouTube authorization exchange failed');
 const t=await r.json();
 if(!t.access_token || !t.refresh_token || t.token_type?.toLowerCase()!=='bearer' || !Number.isFinite(Number(t.expires_in)) || Number(t.expires_in)<=0 || YOUTUBE_SCOPES.some(scope=>!String(t.scope || '').split(' ').includes(scope)))throw Error('Required YouTube authorization was not granted');
 const c=await request('https://www.googleapis.com/youtube/v3/channels?part=id%2Csnippet&mine=true',{headers:{Authorization:`Bearer ${t.access_token}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!c.ok)throw Error('YouTube channel could not be verified');
 const channels=await c.json();
 if(channels.items?.length!==1 || !channels.items[0].id)throw Error('Authorize one YouTube channel');
 return {tokens:{...t,expires_at:Date.now()+Number(t.expires_in)*1000},channelId:channels.items[0].id,channelTitle:channels.items[0].snippet?.title || 'YouTube channel'};
}

export function checkYouTubeUser(saved,user){if(!user?.id || !saved?.userId || user.id!==saved.userId)throw Error('Authorization account changed');}
