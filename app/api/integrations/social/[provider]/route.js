import {NextResponse} from 'next/server';
import {billingAuth,json} from '../../../../../lib/billing';
import {seal,unseal,cookieOptions} from '../../../../../lib/metricool-oauth.mjs';
import {socialAuthorization,socialConfig,SOCIAL_SCOPES} from '../../../../../lib/social-oauth.mjs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in.'},401);}
 const provider=params.provider;if(!Object.hasOwn(SOCIAL_SCOPES,provider))return json({message:'Unknown platform.'},404);
 try{
 let configured=true;try{socialConfig(provider);}catch{configured=false;}
 const {data,error}=await auth.client.from('social_connections').select('*').eq('user_id',auth.user.id).eq('provider',provider).maybeSingle();
 if(error)throw error;
 const saved=data?unseal(data.encrypted_connection):null;
 return json({provider,configured,connection:data?{name:data.account_name,accountId:data.account_id,connectedAt:data.connected_at,selectedPage:saved.selectedPage||null,pages:(saved.pages||[]).map(p=>({id:p.id,name:p.name}))}:null,publishingEnabled:false});
 }catch{return json({message:'Unable to load this connection.'},503);}
}
export async function POST(request,{params}){
 let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in from the app.'},401);}
 const provider=params.provider;if(!Object.hasOwn(SOCIAL_SCOPES,provider))return json({message:'Unknown platform.'},404);
 try{
 const text=await request.text();if(text.length>2000)throw Error();const body=text?JSON.parse(text):{};
 if(body.action==='selectPage'){
 if(provider!=='facebook')throw Error();
 const {data,error}=await auth.client.from('social_connections').select('encrypted_connection').eq('user_id',auth.user.id).eq('provider',provider).single();if(error)throw error;
 const saved=unseal(data.encrypted_connection);const page=saved.pages?.find(p=>p.id===body.pageId);if(!page)throw Error();
 const {error:e}=await auth.client.from('social_connections').update({encrypted_connection:seal({...saved,selectedPage:{id:page.id,name:page.name}})}).eq('user_id',auth.user.id).eq('provider',provider).eq('encrypted_connection',data.encrypted_connection);if(e)throw e;
 return json({message:'Facebook Page selected. Publishing is not enabled yet.'});
 }
 if(body.action && body.action!=='connect')throw Error();
 const pending=socialAuthorization(provider,auth.user.id,(request.headers.get('authorization')||'').replace(/^Bearer /,''));
 const r=NextResponse.json({url:pending.url},{headers:{'Cache-Control':'private, no-store'}});
 r.cookies.set('__Host-music-'+provider,seal(pending.state),cookieOptions);return r;
 }catch{return json({message:'Connection could not be completed. Check platform setup or refresh and try again.'},400);}
}
