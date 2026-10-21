export const MEDIA_BUCKET="promotion-media";
export const MAX_MEDIA_BYTES=50*1024*1024;
export const MAX_COVER_BYTES=5*1024*1024;
const formats={mp4:["video/mp4","video"],mov:["video/quicktime","video"],webm:["video/webm","video"],mp3:["audio/mpeg","audio"],m4a:["audio/mp4","audio"],wav:["audio/wav","audio"],jpg:["image/jpeg","cover"],jpeg:["image/jpeg","cover"],png:["image/png","cover"],webp:["image/webp","cover"]};
export function inspectFile(file,slot) {
  const ext=file.name.split(".").pop().toLowerCase(),format=formats[ext];
  if(!format || (slot==="cover" ? format[1]!=="cover" : format[1]==="cover")) throw new Error(slot==="cover" ? "Choose a JPG, PNG or WebP cover." : "Choose an MP4, MOV, WebM, MP3, M4A or WAV file.");
  if(!file.size || file.size>(slot==="cover" ? MAX_COVER_BYTES : MAX_MEDIA_BYTES)) throw new Error(slot==="cover" ? "Artwork must be under 5 MB." : "Choose a file up to 50 MB. Export a smaller copy if necessary.");
  if(file.type && file.type!==format[0] && !(ext==="wav" && file.type==="audio/x-wav") && !(ext==="m4a" && file.type==="audio/x-m4a")) throw new Error("The file type does not match its extension. Export a supported file and try again.");
  return {ext,type:format[0],kind:format[1]};
}
export function ownedMediaUrl(value,userId,base=process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const url=new URL(value),origin=new URL(base).origin;
    const prefix=`/storage/v1/object/public/${MEDIA_BUCKET}/${userId}/`;
    return url.origin===origin && !url.search && !url.hash && url.pathname.startsWith(prefix) && /^[a-f0-9-]{36}\.(mp4|mov|webm|mp3|m4a|wav|jpg|jpeg|png|webp)$/i.test(url.pathname.slice(prefix.length));
  }catch{return false;}
}
export function releasePath(id){return `/releases/${id}`;}
