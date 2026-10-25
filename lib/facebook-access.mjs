export async function facebookAccess(auth,mutating=false){
 const {data,error}=await auth.client.rpc('facebook_publishing_access');
 if(error||!data)throw Error('Facebook access could not be checked. Please refresh later.');
 if(mutating&&!data.enabled)throw Error(data.reason||'Facebook customer publishing is not enabled.');
 return data;
}
