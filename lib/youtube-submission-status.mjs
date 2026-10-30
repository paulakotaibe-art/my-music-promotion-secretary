export function sandboxYouTubeReceipt(submission,upload,verify){
 const base={direct:true,directPlatform:'YouTube',directUrl:'/youtube-test',released:submission.quota_released===true,resultLabel:'Private YouTube test · Check status',message:'Private YouTube test reserved. Open the YouTube studio to check the existing upload before another copy.'};
 const o=upload?.outcome;
 if(!upload||upload.id!==submission.id||upload.user_id!==submission.user_id||upload.draft_id!==submission.draft_id||upload.mode!=='private'||!o||o.id!==upload.id||o.userId!==upload.user_id||o.channelId!==upload.channel_id||o.mode!=='private'||!verify(o,upload.outcome_signature))return base;
 if(o.verified===true&&o.processed===true&&o.privacy==='private'&&!o.failed)return {...base,resultLabel:'Private YouTube test · Processed',message:'YouTube confirmed private visibility and finished processing for this upload. This is a private test, not a public release. Its trial promotion remains used.',checkedAt:o.checkedAt||null};
 return {...base,resultLabel:o.failed?'Private YouTube test · Needs attention':'Private YouTube test · Check status'};
}
