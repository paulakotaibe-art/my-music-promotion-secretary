import {createHmac,timingSafeEqual} from "node:crypto";
const allowed=["youtube","facebook","tiktok"];
export function validateSchedule(draft,options,now=Date.now()) {
  if(!draft.title?.trim() || !draft.caption?.trim()) throw new Error("Add a campaign title and post caption before scheduling.");
  if(draft.title.length>100 || draft.caption.length>2200) throw new Error("Use a title up to 100 characters and caption up to 2,200 characters for this pilot.");
  if(!Array.isArray(draft.platforms) || !draft.platforms.length || draft.platforms.some(p=>!allowed.includes(p)) || new Set(draft.platforms).size!==draft.platforms.length) throw new Error("Choose YouTube, Facebook or TikTok.");
  const date=new Date(draft.planned_at);
  if(!draft.planned_at || !Number.isFinite(date.getTime()) || date.getTime()<now+600000) throw new Error("Choose a publication time at least ten minutes in the future.");
  let media;
  if(draft.media_url) {
    try {media=new URL(draft.media_url);}catch {throw new Error("Enter a valid video file link.");}
    if(media.protocol!=="https:" || media.username || media.password || !/\.(mp4|mov|webm)$/i.test(media.pathname) || media.hostname.includes(":") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(media.hostname) || /\.(local|internal)$/i.test(media.hostname)) throw new Error("Use a public HTTPS link ending in .mp4, .mov or .webm, not a YouTube watch link.");
  }
  if(draft.platforms.some(p=>p==="youtube" || p==="tiktok") && !media) throw new Error("YouTube and TikTok require an original video file link.");
  if(draft.platforms.includes("youtube") && typeof options.madeForKids!=="boolean") throw new Error("Select whether the YouTube video is made for children.");
  if(draft.platforms.includes("tiktok") && !["PUBLIC_TO_EVERYONE","SELF_ONLY"].includes(options.tiktokPrivacy)) throw new Error("Choose TikTok visibility.");
  if(draft.platforms.includes("tiktok") && options.thirdParty && options.tiktokPrivacy==="SELF_ONLY") throw new Error("TikTok branded content cannot use Only me visibility.");
  if(options.rightsConfirmed!==true) throw new Error("Confirm that you have permission to publish the content.");
  return {date:date.toISOString(),media:media?.href || null};
}
export function buildPost(draft,options,now=Date.now()) {
  const {date,media}=validateSchedule(draft,options,now);
  const post={text:draft.caption,publicationDate:{dateTime:date.slice(0,19),timezone:"UTC"},providers:draft.platforms.map(network=>({network})),draft:false,autoPublish:true,saveExternalMediaFiles:true,shortener:false,media:media ? [media] : []};
  if(draft.platforms.includes("youtube")) post.youtubeData={title:draft.title,type:"video",privacy:"public",madeForKids:options.madeForKids,category:"MUSIC"};
  if(draft.platforms.includes("facebook")) post.facebookData={type:"POST"};
  if(draft.platforms.includes("tiktok")) post.tiktokData={privacyOption:options.tiktokPrivacy,title:draft.title,disableComment:true,disableDuet:true,disableStitch:true,commercialContentOwnBrand:Boolean(options.ownBrand),commercialContentThirdParty:Boolean(options.thirdParty),autoAddMusic:false};
  return post;
}
export function signResult(value,key=process.env.METRICOOL_OAUTH_ENCRYPTION_KEY) {
  if(!key) throw new Error("Signing unavailable");
  const canonical=v=>Array.isArray(v) ? v.map(canonical) : v && typeof v==="object" ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])) : v;
  return createHmac("sha256",key).update(JSON.stringify(canonical(value))).digest("hex");
}
export function verifyResult(value,signature,key=process.env.METRICOOL_OAUTH_ENCRYPTION_KEY) {
  const expected=Buffer.from(signResult(value,key)),actual=Buffer.from(signature || "");
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}
export function safePlannerUrl(value) {
  try {const url=new URL(value);return url.origin==="https://app.metricool.com" ? url.href : null;}catch{return null;}
}
