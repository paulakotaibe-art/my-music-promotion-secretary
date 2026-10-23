export function assertOwnedSubscription(subscription,customerId,userId,livemode){
 const customer=typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id;
 if(customer!==customerId||subscription.metadata?.app_user_id!==userId||subscription.livemode!==livemode)throw new Error('Subscription ownership mismatch');
}
