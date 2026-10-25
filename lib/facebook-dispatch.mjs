import {FACEBOOK_PILOT_OWNER} from './facebook-upload.mjs';
import {assertFacebookReleaseReady,releaseFacebookOnce,describeFacebookRelease} from './facebook-release.mjs';
export function validDispatchReceipt(row,verify){
 const o=row?.outcome;
 return !!(row?.strategy==='app'&&row.user_id===FACEBOOK_PILOT_OWNER&&o&&o.id===row.id&&o.userId===row.user_id&&o.uploadId===row.upload_id&&o.pageId===row.page_id&&o.videoId===row.video_id&&o.mode==='scheduled'&&Date.parse(o.publishAt)===Date.parse(row.publish_at)&&verify(o,row.outcome_signature));
}
export async function dispatchFacebookVideo(call,row,now=Date.now()){
 const time=Date.parse(row.publish_at);
 if(!Number.isFinite(time)||now<time||now>=time+600000)throw Error('Publication is outside its dispatch window.');
 const read=()=>call('/'+row.video_id,{query:{fields:'id,from,status,published,scheduled_publish_time'}});
 let current=await read();if(current.id!==row.video_id)throw Error('Video identity mismatch.');
 const expected={mode:'scheduled',publishAt:row.publish_at};
 if(current.published===true)return {...describeFacebookRelease(current,row.page_id,expected,now),requestAcknowledged:false,alreadyPublished:true};
 assertFacebookReleaseReady(current,row.page_id,row.video_id);
 let acknowledged=false;
 try{
  await releaseFacebookOnce(call,row.video_id,{mode:'public',params:{published:'true'}});acknowledged=true;
  current=await read();if(current.id!==row.video_id)throw Error('Video identity mismatch.');
  return {...describeFacebookRelease(current,row.page_id,expected,now),requestAcknowledged:true};
 }catch(e){e.writeAttempted=true;e.requestAcknowledged=acknowledged;throw e;}
}
