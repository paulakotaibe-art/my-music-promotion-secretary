"use client";
import {useRef,useState,useEffect} from "react";
import {supabase} from "../../lib/supabaseClient";
import {MEDIA_BUCKET,inspectFile} from "../../lib/media.mjs";

export default function MediaUpload({slot,userId,value,kind,onChange,onBusy}) {
  const [progress,setProgress]=useState(null),[error,setError]=useState(""),[consent,setConsent]=useState(false);
  const current=useRef(null),input=useRef(null);
  useEffect(()=>()=>{current.current?.abort();},[]);
  async function upload(file) {
    if(!file)return;
    setError("");
    let format;
    try {format=inspectFile(file,slot);}catch(e){setError(e.message);input.current.value="";return;}
    onBusy(true);setProgress(0);
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session)throw new Error("Please sign in again.");
      const {Upload}=await import("tus-js-client");
      const path=`${userId}/${crypto.randomUUID()}.${format.ext}`;
      const base=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      base.hostname=base.hostname.replace(".supabase.co",".storage.supabase.co");
      await new Promise((resolve,reject)=>{
        current.current=new Upload(file,{endpoint:`${base.origin}/storage/v1/upload/resumable`,headers:{authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY},retryDelays:[0,1000,3000,5000],chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,storeFingerprintForResuming:false,metadata:{bucketName:MEDIA_BUCKET,objectName:path,contentType:format.type,cacheControl:"3600"},onProgress:(sent,total)=>setProgress(Math.round(sent/total*100)),onError:()=>reject(new Error("Upload did not finish. Check your connection and file size, then choose the file again.")),onSuccess:resolve});
        current.current.start();
      });
      const {data}=supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl,format.kind);setProgress(null);
    }catch(e){setError(e.message);setProgress(null);}finally{current.current=null;onBusy(false);if(input.current)input.current.value="";}
  }
  return <div className="upload-panel">
    <h4>{slot==="cover" ? "Album artwork" : "Your video or audio"}</h4>
    <p className="upload-help">{slot==="cover" ? "Choose a square cover for a polished album page. JPG, PNG or WebP; up to 5 MB." : "Choose from your phone or computer. MP4, MOV, WebM, MP3, M4A or WAV; up to 50 MB."}</p>
    <label className="upload-consent"><input type="checkbox" checked={consent} disabled={progress!==null} onChange={e=>setConsent(e.target.checked)}/> I own or have permission to share this file. Uploaded promotional files are accessible to anyone with their link.</label>
    <label className="file-picker">{slot==="cover" ? "Choose album artwork" : "Choose video or audio"}<input ref={input} type="file" disabled={!consent || progress!==null} accept={slot==="cover" ? ".jpg,.jpeg,.png,.webp" : ".mp4,.mov,.webm,.mp3,.m4a,.wav"} onChange={e=>upload(e.target.files?.[0])}/></label>
    {progress!==null && <div role="status"><progress value={progress} max="100" aria-label="Upload progress"/><span> Uploading {progress}% — keep this page open</span></div>}
    {error && <p role="alert">{error}</p>}
    {value && <><p className="upload-success">Uploaded · link generated automatically</p>{slot==="cover" ? <img className="cover-preview" src={value} alt="Uploaded album cover"/> : kind==="audio" ? <audio controls preload="metadata" src={value}/> : <video controls preload="metadata" src={value}/>}<button type="button" disabled={progress!==null} onClick={()=>onChange("",slot==="cover" ? "cover" : "video")}>Remove from draft</button></>}
  </div>;
}
