import {PLANS} from './plans.mjs';
export const ENROLMENT_INTENT_KEY='music-enrolment-intent';
const destinations=new Set(['/dashboard','/get-started','/pricing','/facebook']);
export function enrolmentDestination(next,plan){
 const path=destinations.has(next)?next:'/get-started';
 return path==='/pricing'&&Object.hasOwn(PLANS,plan||'')?path+'?plan='+encodeURIComponent(plan):path;
}
export function enrolmentIntent(next,plan,now=Date.now()){
 return JSON.stringify({destination:enrolmentDestination(next,plan),expires:now+3600000});
}
export function readEnrolmentIntent(raw,now=Date.now()){
 try{const v=JSON.parse(raw);if(!Number.isFinite(v.expires)||v.expires<=now||v.expires>now+3600000)return null;
 const u=new URL(v.destination,'https://enrolment.invalid');const valid=enrolmentDestination(u.pathname,u.searchParams.get('plan'));
 return v.destination===valid?valid:null;}catch{return null;}
}
export function loginUrl(next,plan){const p=new URLSearchParams({next:destinations.has(next)?next:'/get-started'});if(Object.hasOwn(PLANS,plan||''))p.set('plan',plan);return '/login?'+p;}
