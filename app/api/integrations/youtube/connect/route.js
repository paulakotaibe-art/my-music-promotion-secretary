import {NextResponse} from 'next/server';
import {billingAuth,json} from '../../../../../lib/billing';
import {seal,cookieOptions} from '../../../../../lib/metricool-oauth.mjs';
import {youtubeAuthorization,YOUTUBE_COOKIE} from '../../../../../lib/youtube-oauth.mjs';
export const dynamic='force-dynamic';
export async function POST(request){
 let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in from the app.'},401);}
 try{
  const pending=youtubeAuthorization(auth.user.id,(request.headers.get('authorization') || '').replace(/^Bearer /,''));
  const r=NextResponse.json({url:pending.url},{headers:{'Cache-Control':'private, no-store'}});
  r.cookies.set(YOUTUBE_COOKIE,seal(pending.state),cookieOptions);return r;
 }catch{return json({message:'YouTube connection is temporarily unavailable. Please try again later.'},503);}
}
