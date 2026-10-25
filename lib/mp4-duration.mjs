// Bounded ISO-BMFF parsing: require movie duration and a video handler.
export function mp4Duration(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<12||bytes.toString('ascii',4,8)!=='ftyp')throw Error('Choose a valid MP4 video.');
 let duration=null,count=0,video=false;
 function atoms(start,end,depth){
  if(depth>3)throw Error('Unsupported MP4 structure.');
  for(let p=start;p+8<=end;){
   if(++count>20000)throw Error('Unsupported MP4 structure.');let size=bytes.readUInt32BE(p),header=8;const type=bytes.toString('ascii',p+4,p+8);
   if(size===1){if(p+16>end)throw Error('Invalid MP4 atom.');const wide=bytes.readBigUInt64BE(p+8);if(wide>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Invalid MP4 atom.');size=Number(wide);header=16;}else if(size===0)size=end-p;
   if(size<header||p+size>end)throw Error('Incomplete MP4 video.');const b=p+header;
   if(['moov','trak','mdia'].includes(type))atoms(b,p+size,depth+1);
   if(type==='hdlr'&&b+12<=p+size&&bytes.toString('ascii',b+8,b+12)==='vide')video=true;
   if(type==='mvhd'){const version=bytes[b],offset=version===0?12:version===1?20:-1;if(offset<0||b+offset+(version===1?12:8)>p+size)throw Error('Invalid MP4 duration.');const scale=bytes.readUInt32BE(b+offset),ticks=version===1?Number(bytes.readBigUInt64BE(b+offset+4)):bytes.readUInt32BE(b+offset+4);if(!scale||!Number.isSafeInteger(ticks))throw Error('Invalid MP4 duration.');duration=ticks/scale;}p+=size;
  }
 }
 atoms(0,bytes.length,0);if(!video||!Number.isFinite(duration)||duration<=0)throw Error('MP4 duration could not be verified. Export a standard MP4.');return duration;
}
