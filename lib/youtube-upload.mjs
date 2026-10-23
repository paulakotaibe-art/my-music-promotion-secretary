import {youtubeConfig} from './youtube-oauth.mjs';
import {MAX_MEDIA_BYTES} from './media.mjs';
export function videoMetadata(draft,options,now=Date.now()){
 if(!draft.title?.trim() || draft.title.length>100 || !draft.caption?.trim() || draft.caption.length>5000)throw Error('Use a title up to 100 characters and a description up to 5,000 characters.');
 if(options.rightsConfirmed!==true || typeof options.madeForKids!=='boolean' || typeof options.syntheticMedia!=='boolean')throw Error('Confirm publishing rights, audience and altered/synthetic content.');
 if(!['private','public','scheduled'].includes(options.mode))throw Error('Choose a publication mode.');
 const status={privacyStatus:options.mode==='public'?'public':'private',selfDeclaredMadeForKids:options.madeForKids,containsSyntheticMedia:options.syntheticMedia};
 if(options.mode==='scheduled'){
  const time=Date.parse(options.publishAt);
  if(!/Z$|[+-]\d\d:\d\d$/.test(options.publishAt || '') || !Number.isFinite(time) || time<now+600000)throw Error('Choose a date at least ten minutes ahead with an explicit timezone.');
  status.publishAt=new Date(time).toISOString();
 }
 return {snippet:{title:draft.title.trim(),description:draft.caption,categoryId:'10'},status};
}
export async function freshYouTubeToken(tokens,request=fetch,env=process.env,signal=AbortSignal.timeout(15000)){
 if(tokens.access_token && Number(tokens.expires_at)>Date.now()+120000)return tokens;
 const {clientId,clientSecret}=youtubeConfig(env);
 if(!tokens.refresh_token)throw Error('Reconnect YouTube to renew access.');
 const r=await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'refresh_token',refresh_token:tokens.refresh_token}),cache:'no-store',redirect:'error',signal});
 if(!r.ok)throw Error('YouTube access expired or was revoked. Reconnect your channel.');
 const t=await r.json();if(!t.access_token || !Number.isFinite(Number(t.expires_in)) || Number(t.expires_in)<=0)throw Error('YouTube did not renew access.');
 return {...tokens,...t,refresh_token:t.refresh_token || tokens.refresh_token,expires_at:Date.now()+Number(t.expires_in)*1000};
}
export async function readVideo(response){
 if(!response.ok || !response.body)throw Error('Uploaded media could not be loaded.');
 const length=Number(response.headers.get('content-length'));
 if(length>MAX_MEDIA_BYTES)throw Error('Choose an MP4 video up to 50 MB.');
 const chunks=[],reader=response.body.getReader();let size=0;
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX_MEDIA_BYTES)throw Error('Choose an MP4 video up to 50 MB.');chunks.push(part.value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=Buffer.concat(chunks.map(c=>Buffer.from(c)));
 if(size<12 || bytes.subarray(4,8).toString()!=='ftyp')throw Error('The source is not a supported MP4 video.');
 return bytes;
}
export function safeUploadLocation(value){
 try{const u=new URL(value);return u.protocol==='https:' && u.hostname==='www.googleapis.com' && !u.username && !u.password && u.pathname==='/upload/youtube/v3/videos' ? u.href : null;}catch{return null;}
}
export function describeVideo(video,channelId,expected){
 if(!video?.id || video.snippet?.channelId!==channelId)throw Error('Uploaded channel could not be verified.');
 const s=video.status || {},processing=video.processingDetails?.processingStatus,failed=['failed','rejected','deleted'].includes(s.uploadStatus) || processing==='failed',processed=!failed && (processing ? processing==='succeeded' : s.uploadStatus==='processed');
 const timeMatches=expected.publishAt ? Date.parse(s.publishAt)===Date.parse(expected.publishAt) : !s.publishAt;
 const privacyMatches=s.privacyStatus===expected.privacyStatus;
 return {videoId:video.id,url:'https://www.youtube.com/watch?v='+encodeURIComponent(video.id),privacy:s.privacyStatus || 'unknown',uploadStatus:s.uploadStatus || 'unknown',processingStatus:processing || 'unknown',publishAt:s.publishAt || null,verified:privacyMatches && timeMatches && !failed,processed,failed};
}
export async function uploadOnce(call,bytes,metadata){
 const init=await call('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus&notifySubscribers='+String(metadata.status.privacyStatus==='public' || Boolean(metadata.status.publishAt)),{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String(bytes.length)},body:JSON.stringify(metadata)});
 if(!init.ok)throw Error('YouTube did not initialize the upload.');
 const location=safeUploadLocation(init.headers.get('location'));if(!location)throw Error('YouTube upload session could not be verified.');
 // Never repeat the initialization or final upload after an uncertain response.
 const r=await call(location,{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(bytes.length)},body:bytes});
 if(!r.ok)throw Error('YouTube upload result needs checking before retrying.');
 const video=await r.json();if(!/^[a-zA-Z0-9_-]{11}$/.test(video.id || ''))throw Error('YouTube did not return a video identifier.');
 return video.id;
}
