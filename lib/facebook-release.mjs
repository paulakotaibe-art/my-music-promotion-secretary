import {describeFacebookVideo} from './facebook-upload.mjs';
export function facebookReleaseRequest(body,now=Date.now()){
 if(body.confirmed!==true || body.rightsConfirmed!==true || !['public','scheduled'].includes(body.mode))throw Error('Confirm your rights and choose Public now or Schedule.');
 if(body.mode==='public')return {mode:'public',publishAt:null,params:{published:'true'}};
 const time=Date.parse(body.publishAt);
 if(!/Z$|[+-]\d\d:\d\d$/.test(body.publishAt||'') || !Number.isFinite(time) || time<now+600000 || time>now+28*86400000)throw Error('Choose a date between 10 minutes and 28 days ahead, with a timezone.');
 const seconds=Math.floor(time/1000);
 return {mode:'scheduled',publishAt:new Date(seconds*1000).toISOString(),params:{published:'false',scheduled_publish_time:String(seconds)}};
}
export function assertFacebookReleaseReady(video,pageId,videoId){
 const detail=describeFacebookVideo(video,pageId);
 if(detail.videoId!==videoId || !detail.processed || !detail.verified || video.scheduled_publish_time)throw Error('This video must be processed, unpublished and unscheduled on the connected Page. Refresh its status first.');
 return detail;
}
export async function releaseFacebookOnce(call,videoId,request){
 if(!/^\d+$/.test(videoId||'') || !['public','scheduled'].includes(request.mode))throw Error('Invalid release.');
 const d=await call('/'+videoId,{body:request.params});
 if(d!==true && d.success!==true && d.id!==videoId)throw Error('Facebook release outcome needs checking. Do not repeat the request.');
}
export function describeFacebookRelease(video,pageId,expected,now=Date.now()){
 const d=describeFacebookVideo(video,pageId),raw=video.scheduled_publish_time;
 const scheduled=raw?(Number.isFinite(Number(raw))?Number(raw)*1000:Date.parse(raw)):NaN;
 let state='unconfirmed',verified=false;
 if(d.failed)state='failed';
 else if(d.published===true){state=expected.mode==='scheduled'&&now<Date.parse(expected.publishAt)?'published_early':'published';verified=state==='published'&&d.processed;}
 else if(expected.mode==='scheduled' && now>=Date.parse(expected.publishAt))state='awaiting_publication';
 else if(expected.mode==='scheduled' && d.published===false && scheduled===Date.parse(expected.publishAt)){state='scheduled';verified=d.processed;}
 return {...d,verified,state,publishAt:expected.publishAt||null,observedPublishAt:Number.isFinite(scheduled)&&scheduled>0?new Date(scheduled).toISOString():null,scheduleCheck:expected.mode!=='scheduled'?'not_requested':!Number.isFinite(scheduled)||scheduled<=0?'missing':scheduled===Date.parse(expected.publishAt)?'matches':'different'};
}
export function facebookReceiptMessage(receipt,live=true){
 if(!live)return 'Current Facebook status could not be checked. Check Meta Business Suite before another attempt.';
 if(receipt.state==='published'&&receipt.verified)return 'Facebook confirms this video is processed and published.';
 if(receipt.state==='scheduled'&&receipt.verified)return 'Facebook confirms the scheduled time. Final publication will be checked separately.';
 if(receipt.state==='published_early')return 'Attention: Facebook reports this video published before the requested time. Check Meta Business Suite.';
 if(receipt.state==='awaiting_publication')return 'The scheduled time has arrived, but Facebook has not confirmed publication yet.';
 if(receipt.scheduleCheck==='missing')return 'Facebook returned no scheduled time for this video. The requested schedule is not confirmed. Check Meta Business Suite; do not submit another copy.';
 if(receipt.scheduleCheck==='different')return 'Facebook returned a different scheduled time. Check Meta Business Suite before making another request.';
 if(receipt.failed)return 'Facebook reported a processing error. Check Meta Business Suite.';
 if(receipt.verified&&receipt.processed)return 'Facebook confirms this video is processed and unpublished.';
 if(receipt.processingStatus==='processing')return 'Facebook is still processing this video. Do not upload another copy.';
 return 'Facebook has not yet confirmed the requested result. Refresh status before another attempt.';
}
