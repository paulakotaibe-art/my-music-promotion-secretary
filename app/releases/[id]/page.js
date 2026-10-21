import {createClient} from "@supabase/supabase-js";
import {notFound} from "next/navigation";
import {cache} from "react";
export const dynamic="force-dynamic";
const origin="https://my-music-promotion-secretary-x96x.vercel.app";
const getRelease=cache(async(id)=>{
  if(!/^[a-f0-9-]{36}$/i.test(id))return null;
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from("campaign_drafts").select("id,title,artist,caption,cover_url,media_url,media_kind,is_public").eq("id",id).eq("is_public",true).maybeSingle();
  if(error)throw new Error("Unable to load this album page. Please try again shortly.");
  return data;
});
function fileUrl(value,kind) {
  try {const url=new URL(value);if(url.protocol!=="https:" || url.username || url.password)return null;
    if(kind==="cover" && (url.origin!==new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin || !url.pathname.includes("/storage/v1/object/public/promotion-media/")))return null;
    return url.href;
  }catch{return null;}
}
export async function generateMetadata({params}) {
  const release=await getRelease(params.id);
  if(!release)return {title:"Album page unavailable",robots:{index:false,follow:false}};
  const image=fileUrl(release.cover_url,"cover"),description=release.caption.slice(0,200),title=`${release.title}${release.artist ? ` · ${release.artist}` : ""}`;
  return {title,description,alternates:{canonical:`${origin}/releases/${release.id}`},openGraph:{type:"website",title,description,url:`${origin}/releases/${release.id}`,...(image ? {images:[{url:image,alt:`${release.title} album cover`}]} : {})},twitter:{card:image ? "summary_large_image" : "summary",title,description,...(image ? {images:[image]} : {})}};
}
export default async function ReleasePage({params}) {
  const release=await getRelease(params.id);if(!release)notFound();
  const cover=fileUrl(release.cover_url,"cover"),media=fileUrl(release.media_url,"media");
  return <main className="release-page"><div className="release-glow"/><article className="release-shell"><p className="release-eyebrow">MUSIC · STORIES · INSPIRATION</p><div className="release-layout"><div className="release-art">{cover ? <img src={cover} alt={`${release.title} album cover`}/> : <div className="artwork-placeholder">♫</div>}</div><div className="release-copy"><p className="release-eyebrow">{release.media_kind==="audio" ? "LISTEN TO THE RELEASE" : "WATCH THE RELEASE"}</p><h1>{release.title}</h1>{release.artist && <p className="release-artist">{release.artist}</p>}<p className="release-description">{release.caption}</p>{media ? release.media_kind==="audio" ? <audio controls preload="metadata" src={media}/> : <video controls playsInline preload="metadata" poster={cover || undefined} src={media}/> : <p>Media coming soon.</p>}<p className="release-share">Share this page using your browser’s Share menu or copy its address.</p></div></div><footer>Created with <a href={origin}>My Music Promotion Secretary</a></footer></article></main>;
}
