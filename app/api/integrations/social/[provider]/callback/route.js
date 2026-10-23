import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {authenticate} from '../../../../../../lib/server-auth';
import {APP_ORIGIN,seal,unseal,cookieOptions} from '../../../../../../lib/metricool-oauth.mjs';
import {checkSocialState,exchangeSocial,SOCIAL_SCOPES} from '../../../../../../lib/social-oauth.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request,{params}){
 const provider=params.provider;if(!Object.hasOwn(SOCIAL_SCOPES,provider))return new Response('Unknown platform',{status:404});
 const url=new URL(request.url);let outcome='failed';
 try{
 const saved=unseal(cookies().get('__Host-music-'+provider)?.value||'');checkSocialState(saved,url.searchParams.get('state'),provider);
 const code=url.searchParams.get('code');if(url.searchParams.has('error')||!code||code.length>4096)throw Error();
 const auth=await authenticate(saved.accessToken);checkSocialState(saved,url.searchParams.get('state'),provider,auth.user);
 const c=await exchangeSocial(provider,code);
 const {error}=await auth.client.from('social_connections').upsert({user_id:auth.user.id,provider,account_id:c.accountId,account_name:c.accountName,encrypted_connection:seal(c),connected_at:new Date().toISOString()},{onConflict:'user_id,provider'});if(error)throw error;outcome='connected';
 }catch{}
 const r=NextResponse.redirect(APP_ORIGIN+'/social-connections?platform='+provider+'&result='+outcome,303);
 r.headers.set('Cache-Control','private, no-store');r.headers.set('Referrer-Policy','no-referrer');r.cookies.set('__Host-music-'+provider,'',{...cookieOptions,maxAge:0});return r;
}
