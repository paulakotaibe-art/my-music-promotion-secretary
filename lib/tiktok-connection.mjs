import {seal,unseal} from './metricool-oauth.mjs';
export async function freshTiktokTokens(tokens,openId,request=fetch,env=process.env,signal=AbortSignal.timeout(15000),now=Date.now()){
 if(tokens?.access_token&&Number(tokens.expires_at)>now+120000)return tokens;
 if(!tokens?.refresh_token||!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET)throw Error('Reconnect TikTok to renew publishing access.');
 const r=await request('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:tokens.refresh_token}),cache:'no-store',redirect:'error',signal});
 const t=await r.json().catch(()=>null);
 if(!r.ok||!t?.access_token||!t.refresh_token||t.open_id!==openId||!(Number(t.expires_in)>0)||!String(t.scope||'').split(',').includes('video.publish'))throw Error('TikTok renewal could not be verified. Reconnect your account.');
 return {...tokens,...t,expires_at:now+Number(t.expires_in)*1000};
}
export async function tiktokConnection(client,userId,signal,runToken=null,ciphertext=null){
 let encrypted=ciphertext;
 if(!encrypted){const {data,error}=await client.from('social_connections').select('encrypted_connection').eq('user_id',userId).eq('provider','tiktok').single();if(error||!data)throw Error('Connect your own TikTok account first.');encrypted=data.encrypted_connection;}
 let saved=unseal(encrypted);if(saved.tokens?.access_token&&Number(saved.tokens.expires_at)>Date.now()+120000)return saved;
 const {data:lease,error}=await client.rpc('claim_tiktok_refresh',{p_user:userId,p_run_token:runToken});if(error||!lease?.lease)throw Error('TikTok access is being renewed or needs reconnecting. Try again shortly.');
 try{saved=unseal(lease.connection);saved={...saved,tokens:await freshTiktokTokens(saved.tokens,saved.accountId,fetch,process.env,signal)};const {data:ok,error:se}=await client.rpc('finish_tiktok_refresh',{p_user:userId,p_lease:lease.lease,p_connection:seal(saved)});if(se||!ok)throw Error('TikTok renewal could not be saved.');return saved;}catch(e){await client.rpc('finish_tiktok_refresh',{p_user:userId,p_lease:lease.lease,p_connection:null});throw e;}
}
