"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
const labels={accepted:"Queued",rejected:"Needs attention",unknown:"Awaiting confirmation"};
export default function Scheduler({userId,refreshKey}){
 const [records,setRecords]=useState([]),[error,setError]=useState("");
 const reload=useCallback(async()=>{
  try{const {data:{session}}=await supabase.auth.getSession();if(!session)return;
   const response=await fetch("/api/publishing/schedule",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
   const result=await response.json();if(!response.ok)throw new Error("Unable to load post status.");setRecords(result.submissions || []);setError("");
  }catch(e){setError(e.message);}
 },[]);
 useEffect(()=>{reload();},[reload,userId,refreshKey]);
 return <section aria-label="Post status"><h3>Your posts</h3>{error && <p role="alert">{error}</p>}{records.length===0 ? <p>Posts will appear here after you click Publish.</p>:records.map(r=><article className="campaign-card" key={r.id}><h4>{r.title}</h4><strong>{labels[r.status] || "Awaiting confirmation"}</strong><p>{r.status==="accepted" ? "Your post has been accepted for the selected time. Publication is not yet verified.":r.status==="rejected" ? "The publishing service could not accept this post. Your media or account settings need attention.":"We could not confirm the result. Do not create another copy until this attempt has been checked."}</p><p>{r.platforms.join(", ")} · {new Date(r.date).toLocaleString()}</p>{r.plannerUrl && <details><summary>More details</summary><a href={r.plannerUrl} target="_blank" rel="noopener noreferrer">Open publishing receipt</a></details>}</article>)}<button type="button" onClick={reload}>Refresh status</button></section>;
}
