import { createClient } from "@supabase/supabase-js";
export async function authenticate(token) {
  if (!token || token.length>16384) throw new Error("Sign in required");
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`},fetch:(url,options)=>fetch(url,{...options,cache:'no-store'})},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.getUser(token);
  if(error || !data.user) throw new Error("Sign in required");
  return {client,user:data.user};
}
