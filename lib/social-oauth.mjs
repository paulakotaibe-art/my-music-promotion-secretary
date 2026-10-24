import {randomBytes,createHmac} from 'node:crypto';
import {APP_ORIGIN,validateState} from './metricool-oauth.mjs';
export const SOCIAL_SCOPES={facebook:['pages_show_list','pages_read_engagement','pages_manage_posts'],tiktok:['user.info.basic','video.publish']};
export function socialConfig(provider,env=process.env){
 if(!Object.hasOwn(SOCIAL_SCOPES,provider))throw Error('Unsupported platform');
 const facebook=provider==='facebook',id=env[facebook?'FACEBOOK_APP_ID':'TIKTOK_CLIENT_KEY']?.trim(),secret=env[facebook?'FACEBOOK_APP_SECRET':'TIKTOK_CLIENT_SECRET']?.trim();
 const version=env.FACEBOOK_API_VERSION?.trim(),configId=env.FACEBOOK_LOGIN_CONFIG_ID?.trim();
 if(!id || !secret || (facebook&&(!/^v[0-9]+\.[0-9]+$/.test(version || '')||!/^\d+$/.test(configId || ''))))throw Error('Platform connection is not configured');
 return {id,secret,version,configId,callback:APP_ORIGIN+'/api/integrations/social/'+provider+'/callback'};
}
export function socialAuthorization(provider,userId,accessToken,env=process.env){
 const c=socialConfig(provider,env),state=randomBytes(32).toString('base64url');
 const url=new URL(provider==='facebook'?'https://www.facebook.com/'+c.version+'/dialog/oauth':'https://www.tiktok.com/v2/auth/authorize/');
 const params={redirect_uri:c.callback,response_type:'code',state,scope:SOCIAL_SCOPES[provider].join(provider==='facebook'?',':','),[provider==='facebook'?'client_id':'client_key']:c.id};
 if(provider==='facebook'){delete params.scope;params.config_id=c.configId;}
 for(const [k,v]of Object.entries(params))url.searchParams.set(k,v);
 return {url:url.href,state:{provider,userId,accessToken,state,expires:Date.now()+600000}};
}
export function checkSocialState(saved,state,provider,user){if(saved?.provider!==provider)throw Error('Wrong platform');validateState(saved,state);if(user && user.id!==saved.userId)throw Error('Wrong account');}
async function read(request,url,options={}){
 const r=await request(url,{...options,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 const d=await r.json().catch(()=>null);if(!r.ok || !d || (d.error && d.error.code!=='ok')){const e=Error('Platform request failed');e.httpStatus=r.status;if(Number.isInteger(d?.error?.code))e.providerCode=d.error.code;throw e;}return d;
}
export async function exchangeSocial(provider,code,request=fetch,env=process.env){
 const c=socialConfig(provider,env);
 if(provider==='tiktok'){
 const t=await read(request,'https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:c.id,client_secret:c.secret,code,grant_type:'authorization_code',redirect_uri:c.callback})});
 if(!t.access_token||!t.refresh_token||!t.open_id||!(Number(t.expires_in)>0)||SOCIAL_SCOPES.tiktok.some(s=>!String(t.scope||'').split(',').includes(s)))throw Error('Required TikTok permissions missing');
 const p=await read(request,'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',{headers:{Authorization:'Bearer '+t.access_token}});
 if(p.data?.user?.open_id!==t.open_id)throw Error('Account mismatch');
 return {accountId:t.open_id,accountName:p.data.user.display_name||'TikTok creator',tokens:{...t,expires_at:Date.now()+Number(t.expires_in)*1000},pages:[]};
 }
 const url=new URL('https://graph.facebook.com/'+c.version+'/oauth/access_token');
 for(const [k,v]of Object.entries({client_id:c.id,client_secret:c.secret,redirect_uri:c.callback,code}))url.searchParams.set(k,v);
 const t=await read(request,url.href);if(!t.access_token)throw Error('Facebook token missing');
 const proof=createHmac('sha256',c.secret).update(t.access_token).digest('hex');
 const graph=async(path)=>read(request,'https://graph.facebook.com/'+c.version+path+(path.includes('?')?'&':'?')+'appsecret_proof='+proof,{headers:{Authorization:'Bearer '+t.access_token}});
 const permissions=await graph('/me/permissions');
 if(SOCIAL_SCOPES.facebook.some(s=>!permissions.data?.some(p=>p.permission===s&&p.status==='granted')))throw Error('Required Page permissions missing');
 const me=await graph('/me?fields=id,name'),pages=await graph('/me/accounts?fields=id,name,access_token,tasks&limit=100');
 if(!me.id || !Array.isArray(pages.data) || pages.paging?.next)throw Error('Unable to list all Pages');
 const usable=pages.data.filter(p=>p.id&&p.access_token&&Array.isArray(p.tasks)&&p.tasks.some(t=>['CREATE_CONTENT','MANAGE','PROFILE_PLUS_CREATE_CONTENT'].includes(t)));
 if(!usable.length)throw Error('No Page with content publishing access');
 return {accountId:me.id,accountName:me.name||'Facebook',tokens:{...t,expires_at:t.expires_in?Date.now()+Number(t.expires_in)*1000:null},pages:usable};
}
