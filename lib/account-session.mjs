import {withDeadline} from './deadline.mjs';

export async function accountSession(auth,timeoutMs=8000){
 if(!auth)throw Error('Sign-in is temporarily unavailable. Please try again later.');
 const result=await withDeadline(()=>auth.getSession(),timeoutMs,'Sign-in check timed out. Check your connection and retry.');
 if(result.error)throw Error('Your sign-in could not be checked. Please sign in again.');
 return result.data?.session||null;
}

// Auth callbacks stay synchronous: do not call another Auth method inside one.
export function accountChanged(event,session,userId){
 return event==='SIGNED_OUT'||event==='SIGNED_IN'&&!!userId&&session?.user?.id!==userId;
}
