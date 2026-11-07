const {execFileSync}=require('node:child_process');
// Compare against the last successful deployment, never just HEAD^.
// Exit 0 only when it is positively safe to skip a documentation-only update.
function rootDocumentationOnly(files){
 return files.length>0&&files.every(path=>!path.includes('/')&&/\.md$/i.test(path));
}
function shouldIgnore(env=process.env,cwd=process.cwd()){
 const previous=env.VERCEL_GIT_PREVIOUS_SHA;
 const current=env.VERCEL_GIT_COMMIT_SHA;
 if(!/^[a-f0-9]{40}$/i.test(previous||'')||!current||!/^[a-f0-9]{40}$/i.test(current))return false;
 try{
  const files=execFileSync('git',['diff','--name-only',previous,current,'--'],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim().split('\n').filter(Boolean);
  return rootDocumentationOnly(files);
 }catch{return false;}
}
module.exports={rootDocumentationOnly,shouldIgnore};
if(require.main===module){
 const skip=shouldIgnore();
 console.log(skip?'Skip build: only root documentation changed since the last successful deployment.':'Build required: runtime changes or comparison unavailable.');
 process.exit(skip?0:1);
}
