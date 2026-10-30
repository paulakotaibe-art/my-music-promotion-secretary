export async function facebookReadinessAccess(auth,sandbox=false){
 if(sandbox)return {data:{enabled:false},error:null};
 return auth.client.rpc('facebook_publishing_access');
}
