export function connectionResults(providers,results){
 const data={},errors={};
 providers.forEach((provider,index)=>{
  const result=results[index];
  if(result?.status==='fulfilled'&&result.value?.provider===provider)data[provider]=result.value;
  else errors[provider]='Unable to check this connection. Refresh connections to try again.';
 });
 return {data,errors};
}
