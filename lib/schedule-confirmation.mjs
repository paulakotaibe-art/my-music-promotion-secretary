import {toolData} from './metricool-oauth.mjs';
import {safePlannerUrl} from './scheduling.mjs';

// A successful write is not evidence that all requested networks survived.
// Only read after the single write; uncertainty must never cause a second post.
export async function scheduleAndConfirm(call,brandId,expected) {
 const result=await call('createscheduledpost',{blogId:brandId,date:expected.publicationDate.dateTime+'Z',info:JSON.stringify(expected)});
 if(result.isError)return {status:'rejected',message:'The publishing service could not accept the post. Its media, permissions or account limits need attention.'};
 const data=toolData(result),created=data.data || data.post || data;
 const plannerUrl=safePlannerUrl(data.plannerUrl || created.plannerUrl);
 const linkedUuid=plannerUrl ? new URL(plannerUrl).searchParams.get('openWithPostUuid') : null;
 const uuid=created.uuid==null ? linkedUuid : String(created.uuid);
 const providerId=created.id ?? null;
 const unknown={status:'unknown',message:'The post was sent, but all selected platforms and the publication time could not be confirmed. Check this attempt before creating another copy.',plannerUrl,providerId,providerUuid:uuid};
 if(!uuid && providerId==null)return unknown;
 try {
  const instant=Date.parse(expected.publicationDate.dateTime+'Z');
  const listed=toolData(await call('getscheduledposts',{brandId,fromDate:new Date(instant-86400000).toISOString(),toDate:new Date(instant+86400000).toISOString(),timezone:'UTC',extendedRange:false}));
  const posts=Array.isArray(listed) ? listed : listed.data;
  if(!Array.isArray(posts))return unknown;
  const saved=posts.find(p=>uuid ? String(p.uuid)===uuid : String(p.id)===String(providerId));
  if(!saved)return unknown;
  const actual=saved.providers || [],requested=expected.providers.map(p=>p.network);
  const missing=requested.filter(n=>!actual.some(p=>p.network===n));
  const failed=actual.filter(p=>requested.includes(p.network) && ['ERROR','FAILED','REJECTED'].includes(p.status)).map(p=>p.network);
  const date=saved.publicationDate;
  const timeMatches=date?.timezone==='UTC' && Date.parse(date.dateTime+(/Z$|[+-]\d\d:\d\d$/.test(date.dateTime)?'':'Z'))===instant;
  const details={...unknown,providerId:saved.id ?? providerId,confirmedPlatforms:requested.filter(n=>!missing.includes(n) && !failed.includes(n)),checkedAt:new Date().toISOString()};
  if(missing.length || failed.length || !timeMatches || saved.draft!==false || saved.autoPublish!==true) {
   const issues=[missing.length && `Missing platforms: ${missing.join(', ')}.`,failed.length && `Platform errors: ${failed.join(', ')}.`,!timeMatches && 'The publication time differs or could not be verified.',(saved.draft!==false || saved.autoPublish!==true) && 'Automatic publishing is not confirmed.'].filter(Boolean);
   return {...details,message:`The publishing service saved this attempt with a discrepancy. ${issues.join(' ')} Check this attempt before creating another copy.`};
  }
  return {...details,status:'accepted',message:'All selected platforms and the publication time were confirmed in the publishing queue. Publication has not yet been verified.'};
 }catch{return unknown;}
}
