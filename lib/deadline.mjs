export async function withDeadline(work,milliseconds,message,onTimeout=()=>{}){
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{onTimeout();reject(new Error(message));},milliseconds);});
 try{return await Promise.race([Promise.resolve().then(work),timeout]);}finally{clearTimeout(timer);}
}
