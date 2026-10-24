import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {authenticate} from '../../../../../../lib/server-auth';
import {APP_ORIGIN,seal,unseal,cookieOptions} from '../../../../../../lib/metricool-oauth.mjs';
import {checkSocialState,exchangeSocial,SOCIAL_SCOPES} from '../../../../../../lib/social-oauth.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request,{params}){
 const provider=params.provider;if(!Object.hasOwn(SOCIAL_SCOPES,provider))return new Response('Unknown platform',{status:404});
 const url=new URL(request.url);let outcome='failed',stage='session',reason='session';
 try{
 const saved=unseal(cookies().get('__Host-music-'+provider)?.value||'');checkSocialState(saved,url.searchParams.get('state'),provider);
 stage='consent';const code=url.searchParams.get('code');if(url.searchParams.has('error')||!code||code.length>4096)throw Error();
 stage='signin';const auth=await authenticate(saved.accessToken);checkSocialState(saved,url.searchParams.get('state'),provider,auth.user);
 stage='provider';const c=await exchangeSocial(provider,code);
 stage='storage';const {error}=await auth.client.from('social_connections').upsert({user_id:auth.user.id,provider,account_id:c.accountId,account_name:c.accountName,encrypted_connection:seal(c),connected_at:new Date().toISOString()},{onConflict:'user_id,provider'});if(error)throw error;outcome='connected';
 }catch(e){
 const known={'Required Page permissions missing':'permissions','No Page with content publishing access':'page_access','Unable to list all Pages':'page_list'};
 reason=known[e?.message]||stage;
 console.warn('social_connection_failed',{provider,stage,reason,httpStatus:Number.isInteger(e?.httpStatus)?e.httpStatus:undefined,providerCode:Number.isInteger(e?.providerCode)?e.providerCode:undefined,pageDiagnostics:e?.pageDiagnostics?Object.fromEntries(['returned','withToken','withContentTask','withoutTasks'].filter(k=>Number.isInteger(e.pageDiagnostics[k])).map(k=>[k,e.pageDiagnostics[k]])):undefined});
 }
 const r=NextResponse.redirect(APP_ORIGIN+'/social-connections?platform='+provider+'&result='+outcome+(outcome==='failed'?'&reason='+reason:''),303);
 r.headers.set('Cache-Control','private, no-store');r.headers.set('Referrer-Policy','no-referrer');r.cookies.set('__Host-music-'+provider,'',{...cookieOptions,maxAge:0});return r;
}
