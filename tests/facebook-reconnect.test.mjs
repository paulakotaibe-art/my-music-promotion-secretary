import test from 'node:test';
import assert from 'node:assert/strict';
import {retainFacebookPage} from '../lib/social-oauth.mjs';
const previous={accountId:'owner',selectedPage:{id:'123',name:'Old name'},pages:[{id:'123',access_token:'old-token'}]};
const fresh={accountId:'owner',tokens:{access_token:'new-user-token'},pages:[{id:'123',name:'New name',access_token:'new-page-token',tasks:['CREATE_CONTENT']}]};
test('reconnect retains only the selected Page identity with fresh authorization and tokens',()=>{
 const result=retainFacebookPage(fresh,previous);
 assert.deepEqual(result.selectedPage,{id:'123',name:'New name'});
 assert.equal(result.pages[0].access_token,'new-page-token');
 assert.equal(result.tokens.access_token,'new-user-token');
 assert.equal('selectedPage' in fresh,false);
});
test('reconnect never transfers selection to another account or unauthorized Page',()=>{
 for(const connection of [{...fresh,accountId:'different'},{...fresh,pages:[]},{...fresh,pages:[{...fresh.pages[0],access_token:null}]},{...fresh,pages:[{...fresh.pages[0],tasks:['ANALYZE']}]}]){
 assert.equal('selectedPage' in retainFacebookPage(connection,previous),false);
 }
 assert.equal('selectedPage' in retainFacebookPage(fresh,null),false);
 assert.equal('selectedPage' in retainFacebookPage({...fresh,selectedPage:{id:'injected'}},null),false);
});
