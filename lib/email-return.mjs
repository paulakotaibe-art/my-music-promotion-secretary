// Supabase consumes invitation/magic-link fragments during client initialization.
// Wait for that initialization and a verified user before leaving the landing page.
export function hasEmailReturn(url){
 const u=new URL(url),fragment=new URLSearchParams(u.hash.slice(1));
 return ['access_token','refresh_token','error','error_description'].some(k=>fragment.has(k))||u.searchParams.has('error');
}
export async function emailReturnDestination(auth,url){
 if(!hasEmailReturn(url))return null;
 const u=new URL(url),fragment=new URLSearchParams(u.hash.slice(1));
 if(fragment.has('error')||u.searchParams.has('error')||!auth)return '/login?notice=link';
 try{
  const {data,error}=await auth.getSession();
  if(error||!data?.session)return '/login?notice=link';
  const result=await auth.getUser();
  return !result.error&&result.data?.user?'/dashboard':'/login?notice=link';
 }catch{return '/login?notice=link';}
}
