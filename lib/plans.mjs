export const PLANS={
 starter:{name:"Starter Artist",pence:799,weekly:3,queue:12},
 growth:{name:"Growth Artist",pence:1499,weekly:10,queue:40},
 executive:{name:"Executive Artist",pence:2499,weekly:25,queue:100}
};
export function verifiedPlan(subscription){
 const item=subscription.items?.data;
 if(item?.length!==1||item[0].quantity!==1)return null;
 const price=item[0].price,plan=subscription.metadata?.app_plan;
 const p=PLANS[plan];
 return p&&price.currency==='gbp'&&price.unit_amount===p.pence&&price.recurring?.interval==='month'&&price.recurring.interval_count===1?plan:null;
}
