const names={youtube:'YouTube',facebook:'Facebook',tiktok:'TikTok'};
export function publishingReadiness(allowance,connections){
 const owner=allowance.owner===true,limit=Number.isInteger(allowance.limit)?allowance.limit:0,remaining=Number.isInteger(allowance.remaining)?Math.max(0,Math.min(limit,allowance.remaining)):0;
 return {owner,plan:allowance.plan,allowanceText:owner?'Owner account · unlimited promotions':`${remaining} of ${limit} ${allowance.plan==='trial'?'trial':'weekly'} promotions remaining`,queued:allowance.queued||0,queueLimit:allowance.queueLimit,periodEnd:allowance.periodEnd||null,channels:Object.entries(names).map(([provider,name])=>{
 const c=connections[provider]||{},connected=c.connected===true,selected=provider!=='facebook'||c.pageSelected===true;
 const ready=(owner&&provider!=='tiktok'||['facebook','tiktok'].includes(provider)&&c.publishingEnabled===true)&&connected&&selected;
 let reason=ready?(owner?'Your owner publishing studio is available.':'Your '+name+' studio is available. '+(!allowance.canPublish?(allowance.reason||'Check your promotion allowance.'):'Review your video and publish when ready.')):!connected?'Connect your own '+name+' account.':!selected?'Choose your Facebook Page.':provider==='tiktok'?'TikTok publishing integration and approval are still being completed.':!allowance.canPublish?(allowance.reason||'Subscriber publishing is being prepared for launch.'):'Subscriber platform approval and rollout checks are not yet verified.';
 const steps=[{label:'Connect your '+name+' account',complete:connected}];
 if(provider==='facebook')steps.push({label:'Choose a Page you can publish to',complete:connected&&selected});
 steps.push({label:owner?'Owner publishing studio available':'Customer publishing approved and enabled',complete:owner?ready:['facebook','tiktok'].includes(provider)&&c.publishingEnabled===true});
 return {steps,provider,name,connected,pageSelected:provider==='facebook'?selected:undefined,ready,reason,href:provider==='youtube'?'/connections':'/social-connections',studio:owner&&provider==='youtube'?'/youtube-test':provider==='facebook'&&(owner||c.publishingEnabled===true)?'/facebook':provider==='tiktok'?'/tiktok':null};
 })};
}
