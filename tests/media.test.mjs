import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFile,ownedMediaUrl,MAX_MEDIA_BYTES} from '../lib/media.mjs';
test('uploads enforce media type, size, and artwork restrictions before sending',()=>{
 assert.equal(inspectFile({name:'track.MP3',type:'audio/mpeg',size:4000},'media').kind,'audio');
 assert.equal(inspectFile({name:'cover.png',type:'image/png',size:4000},'cover').kind,'cover');
 for(const file of [{name:'x.svg',size:400},{name:'x.mp4',size:MAX_MEDIA_BYTES+1},{name:'x.mp4',size:400,type:'text/html'},{name:'x.mp3',size:0}])assert.throws(()=>inspectFile(file,'media'));
 assert.throws(()=>inspectFile({name:'x.mp4',size:400},'cover'));
});
test('owned generated links require the exact origin, bucket and account folder',()=>{
 const base='https://example.supabase.co',user='e28a6564-46cd-4034-8eb9-8ad1c82587e6';
 const url=`${base}/storage/v1/object/public/promotion-media/${user}/b532a5a5-758e-42a8-b7f0-daa119e8410b.mp4`;
 assert.ok(ownedMediaUrl(url,user,base));
 assert.equal(ownedMediaUrl(url,'other-user',base),false);
 assert.equal(ownedMediaUrl(url+'?download=1',user,base),false);
 assert.equal(ownedMediaUrl(url.replace(base,'https://evil.example'),user,base),false);
});
