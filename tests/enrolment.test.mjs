import test from 'node:test';import assert from 'node:assert/strict';
import {enrolmentDestination,enrolmentIntent,readEnrolmentIntent,loginUrl} from '../lib/enrolment.mjs';
test('account return destinations and selected plans stay inside the app',()=>{
 assert.equal(enrolmentDestination('/pricing','starter'),'/pricing?plan=starter');
 for(const next of ['https://evil.example','//evil.example','/api/facebook/dispatch','javascript:alert(1)'])assert.equal(enrolmentDestination(next),'/get-started');
 assert.equal(enrolmentDestination('/pricing','made-up'),'/pricing');
 assert.equal(loginUrl('/pricing','growth'),'/login?next=%2Fpricing&plan=growth');
});
test('saved enrolment intent expires and cannot redirect to an external destination',()=>{
 const now=100000;assert.equal(readEnrolmentIntent(enrolmentIntent('/pricing','starter',now),now),'/pricing?plan=starter');
 assert.equal(readEnrolmentIntent(enrolmentIntent('/facebook',null,now),now+3600000),null);
 for(const destination of ['https://evil.example','//evil.example','/pricing?plan=fake','/facebook?unexpected=1'])assert.equal(readEnrolmentIntent(JSON.stringify({destination,expires:now+100}),now),null);
 assert.equal(readEnrolmentIntent('invalid',now),null);
});
