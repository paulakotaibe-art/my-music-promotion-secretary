// Test mode is the default. Never fall back to a live key when a test key is absent or invalid.
export function billingMode(env=process.env){
 const mode=env.BILLING_MODE||'test';
 if(!['test','live'].includes(mode))throw new Error('Invalid billing mode.');
 return mode;
}
export function billingCredentials(env=process.env,mode=billingMode(env)){
 if(!['test','live'].includes(mode))throw new Error('Invalid billing mode.');
 const key=mode==='test'?env.STRIPE_TEST_SECRET_KEY:env.STRIPE_SECRET_KEY;
 if(!new RegExp(`^(sk|rk)_${mode}_`).test(key||''))throw new Error(`Stripe ${mode} key is not configured.`);
 return {key,testMode:mode==='test'};
}

export function webhookSecretFor(config,livemode,env=process.env){
 const value=(livemode?env.STRIPE_WEBHOOK_SECRET:env.STRIPE_TEST_WEBHOOK_SECRET)||config.webhookSecret;
 if(value&&!value.startsWith('whsec_'))throw new Error('Invalid webhook signing secret configuration.');
 return value;
}
