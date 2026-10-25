import {APP_ORIGIN} from './metricool-oauth.mjs';
const paths=new Set(['/v2/post/publish/creator_info/query/','/v2/post/publish/video/init/','/v2/post/publish/status/fetch/']);
export function tiktokCall(token,request=fetch,signal=AbortSignal.timeout(15000)){
 if(!token)throw Error('Reconnect TikTok.');
 return async(path,body={})=>{
  if(!paths.has(path))throw Error('Invalid TikTok operation.');
  const r=await request('https://open.tiktokapis.com'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.error?.code!=='ok'||!d.data){const e=Error('TikTok could not confirm this request. Check access and status before trying again.');if(/^[a-z_]{1,100}$/.test(d?.error?.code||''))e.providerCode=d.error.code;throw e;}return d.data;
 };
}
export function creatorView(c,audited=false){
 if(!c?.creator_nickname||!c.creator_username||!Array.isArray(c.privacy_level_options)||!Number.isFinite(c.max_video_post_duration_sec)||c.max_video_post_duration_sec<=0)throw Error('TikTok creator settings could not be verified.');
 const options=c.privacy_level_options.filter(p=>['PUBLIC_TO_EVERYONE','MUTUAL_FOLLOW_FRIENDS','FOLLOWER_OF_CREATOR','SELF_ONLY'].includes(p));
 if(!options.length)throw Error('No TikTok privacy options are available.');
 return {username:c.creator_username,nickname:c.creator_nickname,privacyOptions:audited?options:options.filter(p=>p==='SELF_ONLY'),privateAccount:options.includes('FOLLOWER_OF_CREATOR')&&!options.includes('PUBLIC_TO_EVERYONE'),commentDisabled:c.comment_disabled!==false,duetDisabled:c.duet_disabled!==false,stitchDisabled:c.stitch_disabled!==false,maxDuration:c.max_video_post_duration_sec};
}
export function validateTiktokPost(b,c,duration,audited=false,now=Date.now()){
 if(typeof b.caption!=='string'||b.caption.length>2200)throw Error('Use a caption up to 2,200 characters.');
 if(!c.privacyOptions.includes(b.privacy))throw Error('Choose an available TikTok privacy option.');
 if(!audited&&(b.privacy!=='SELF_ONLY'||!c.privateAccount))throw Error('Before TikTok audit, the test account must be private and the post Only me.');
 if(!Number.isFinite(duration)||duration<=0||duration>c.maxDuration)throw Error('Video duration exceeds your TikTok limit or could not be measured.');
 const keys=['allowComment','allowDuet','allowStitch','commercial','ownBrand','thirdParty','aiGenerated'];
 for(const k of keys)if(typeof b[k]!=='boolean')throw Error('Review all interaction and disclosure settings.');
 if(b.allowComment&&c.commentDisabled||b.allowDuet&&c.duetDisabled||b.allowStitch&&c.stitchDisabled)throw Error('This interaction is disabled in TikTok settings.');
 if(b.rightsConfirmed!==true||b.musicConsent!==true||b.confirmed!==true)throw Error('Confirm content rights and TikTok music-use consent.');
 if(b.commercial&&!b.ownBrand&&!b.thirdParty||!b.commercial&&(b.ownBrand||b.thirdParty))throw Error('Review your commercial-content disclosure.');
 if(b.thirdParty&&(b.privacy==='SELF_ONLY'||b.brandedConsent!==true))throw Error('Paid partnerships cannot be Only me and require the branded-content acknowledgement.');
 let publishAt=null;if(b.publishAt){const at=Date.parse(b.publishAt);if(!/Z$|[+-]\d\d:\d\d$/.test(b.publishAt)||!Number.isFinite(at)||at<now+600000||at>now+28*86400000)throw Error('Choose a release 10 minutes to 28 days ahead with a timezone.');publishAt=new Date(at).toISOString();}
 return {caption:b.caption,privacy:b.privacy,...Object.fromEntries(keys.map(k=>[k,b[k]])),rightsConfirmed:true,musicConsent:true,brandedConsent:b.brandedConsent===true,confirmed:true,publishAt};
}
export function postPayload(e,url,c,audited){const v=validateTiktokPost({...e,publishAt:null},c,e.duration,audited);const u=new URL(url);if(u.origin!==APP_ORIGIN||u.pathname!=='/api/tiktok/media'||!u.searchParams.get('ticket'))throw Error('Invalid media destination.');return {post_info:{title:v.caption,privacy_level:v.privacy,disable_comment:!v.allowComment,disable_duet:!v.allowDuet,disable_stitch:!v.allowStitch,brand_content_toggle:v.thirdParty,brand_organic_toggle:v.ownBrand,is_aigc:v.aiGenerated},source_info:{source:'PULL_FROM_URL',video_url:url}};}
export function validTiktokReceipt(r,verify){const e=r?.expected;return !!(e&&e.id===r.id&&e.userId===r.user_id&&e.draftId===r.draft_id&&e.openId===r.open_id&&(e.publishAt===null?r.publish_at===null:Date.parse(e.publishAt)===Date.parse(r.publish_at))&&verify(e,r.expected_signature));}
export function describeTiktokStatus(d,e,username){
 if(d?.status==='FAILED')return {state:'failed',verified:false,providerStatus:d.status,...(/^[a-z_]{1,100}$/.test(d.fail_reason||'')?{providerErrorCode:d.fail_reason}:{})};
 if(d?.status==='PUBLISH_COMPLETE'){
  if(e.privacy!=='PUBLIC_TO_EVERYONE')return {state:'nonpublic',verified:true,providerStatus:d.status};
  const ids=(Array.isArray(d.publicaly_available_post_id)?d.publicaly_available_post_id:[]).filter(x=>typeof x==='string'||Number.isSafeInteger(x)).map(String).filter(x=>/^\d{1,30}$/.test(x));
  if(ids.length)return {state:'published',verified:true,providerStatus:d.status,postIds:ids,...(/^[A-Za-z0-9_.]{1,32}$/.test(username||'')?{url:'https://www.tiktok.com/@'+username+'/video/'+ids[0]}:{})};
  return {state:'processing',verified:false,providerStatus:d.status};
 }
 return ['PROCESSING_UPLOAD','PROCESSING_DOWNLOAD'].includes(d?.status)?{state:'processing',verified:false,providerStatus:d.status}:{state:'unconfirmed',verified:false};
}
