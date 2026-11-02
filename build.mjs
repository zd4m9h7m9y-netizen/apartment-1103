// Expand the static game on Vercel with Node built-ins only.
import fs from 'node:fs';import path from 'node:path';import {inflateRawSync} from 'node:zlib';
const bytes=fs.readFileSync('game-files.zip'),output=path.resolve('dist');let end=-1;
for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){if(bytes.readUInt32LE(p)===0x06054b50){end=p;break}}
if(end<0)throw Error('Invalid game archive');const count=bytes.readUInt16LE(end+10);let pos=bytes.readUInt32LE(end+16),total=0;if(count>5000)throw Error('Unexpected archive size');
const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0}
function crc32(buf){let c=0xffffffff;for(const b of buf)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
fs.mkdirSync(output,{recursive:true});
for(let i=0;i<count;i++){
 if(bytes.readUInt32LE(pos)!==0x02014b50)throw Error('Invalid archive entry');const flags=bytes.readUInt16LE(pos+8),method=bytes.readUInt16LE(pos+10),crc=bytes.readUInt32LE(pos+16),compressed=bytes.readUInt32LE(pos+20),length=bytes.readUInt32LE(pos+24),nl=bytes.readUInt16LE(pos+28),extra=bytes.readUInt16LE(pos+30),comment=bytes.readUInt16LE(pos+32),offset=bytes.readUInt32LE(pos+42),name=bytes.subarray(pos+46,pos+46+nl).toString('utf8');pos+=46+nl+extra+comment;
 if(flags&1||!name.startsWith('public/')||name.includes('\\'))throw Error('Unsupported archive entry');const relative=name.slice(7);if(!relative||name.endsWith('/'))continue;const target=path.resolve(output,relative);if(!target.startsWith(output+path.sep))throw Error('Invalid asset path');
 if(bytes.readUInt32LE(offset)!==0x04034b50)throw Error('Invalid asset header');const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28),data=bytes.subarray(start,start+compressed);if(data.length!==compressed)throw Error('Truncated archive');
 const content=method===0?data:method===8?inflateRawSync(data,{maxOutputLength:64*1024*1024}):null;if(!content||content.length!==length||crc32(content)!==crc)throw Error('Asset integrity check failed: '+name);total+=content.length;if(total>128*1024*1024)throw Error('Unexpected expanded archive size');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
}
if(!fs.existsSync(path.join(output,'index.html')))throw Error('Game entry missing');const root=path.join(output,'assets/environment'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
for(const [id,a]of Object.entries(manifest.assets))for(const f of [a.path,a.animation?.path].filter(Boolean))if(!fs.existsSync(path.resolve(root,f)))throw Error('Missing asset: '+id);
console.log(`Apartment 1103 ready: ${count} files, ${manifest.scenes.length} scenes. Output: dist/`);
