import deploymentConfig from './deployment-config.cjs';
export function youtubeTestPermission(sandbox,access,mode){
 if(!sandbox)return false;
 return mode==='private'&&access?.enabled===true&&access?.allowance?.owner===false&&access?.allowance?.remaining>0;
}
export async function youtubeTestAccess(auth,env=process.env){
 if(!deploymentConfig.sandboxMode(env))return {enabled:false};
 const {data,error}=await auth.client.rpc('youtube_private_test_access');
 if(error)throw Error('Sandbox YouTube test access is unavailable.');
 return data;
}
