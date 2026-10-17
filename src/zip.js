/* Dependency-free ZIP reader/writer. ZIP64, encrypted and multi-disk archives are intentionally rejected. */
const Zip = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const MAX_ENTRY = 32 * 1024 * 1024, MAX_TOTAL = 100 * 1024 * 1024;
  const u16 = (d,o) => d.getUint16(o,true), u32=(d,o)=>d.getUint32(o,true);
  const crcTable = Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
  function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
  async function inflate(data){ if(!('DecompressionStream' in globalThis))throw Error('This browser does not support local ZIP decompression. Use a current Chrome, Edge or Firefox.');
    const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(reader).arrayBuffer()); }
  async function read(bytes){ const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes), d=new DataView(b.buffer,b.byteOffset,b.byteLength);
    if(b.length<22)throw Error('Invalid ZIP file'); let eocd=-1;
    for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(u32(d,i)===0x06054b50){eocd=i;break;}
    if(eocd<0)throw Error('Could not locate ZIP directory');const count=u16(d,eocd+10),offset=u32(d,eocd+16);
    if(count>5000)throw Error('ZIP contains too many entries');if(offset> b.length)throw Error('Invalid ZIP directory');
    let at=offset,total=0;const entries=new Map();
    for(let i=0;i<count;i++){
      if(u32(d,at)!==0x02014b50)throw Error('Invalid ZIP directory entry');const flag=u16(d,at+8),method=u16(d,at+10),crc=u32(d,at+16),csize=u32(d,at+20),usize=u32(d,at+24),nl=u16(d,at+28),extra=u16(d,at+30),comment=u16(d,at+32),lo=u32(d,at+42);
      const name=dec.decode(b.slice(at+46,at+46+nl));at+=46+nl+extra+comment;
      if(flag&1)throw Error('Encrypted workbooks are not supported'); if(method!==0&&method!==8)throw Error('Unsupported ZIP compression method');
      if(usize>MAX_ENTRY||csize>MAX_ENTRY||total+usize>MAX_TOTAL)throw Error('ZIP archive exceeds the safe import size limit');
      if(name.startsWith('/')||name.includes('..')||name.includes('\\'))throw Error('Unsafe path in ZIP archive');
      if(u32(d,lo)!==0x04034b50)throw Error('Invalid ZIP entry offset');const start=lo+30+u16(d,lo+26)+u16(d,lo+28);
      if(start+csize>b.length)throw Error('Truncated ZIP data');const packed=b.slice(start,start+csize);const data=method===0?packed:await inflate(packed);
      if(data.length!==usize||crc32(data)!==crc)throw Error('ZIP entry failed integrity validation');
      entries.set(name,data);total+=data.length;
    }return entries;
  }
  function write(entries){const files=entries instanceof Map?[...entries]:Object.entries(entries);const parts=[],centers=[];let offset=0;
    for(const [name,input] of files){const data=typeof input==='string'?enc.encode(input):(input instanceof Uint8Array?input:new Uint8Array(input));const nb=enc.encode(name);if(data.length>MAX_ENTRY)throw Error('Export entry too large');
      const h=new Uint8Array(30+nb.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc32(data),true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nb.length,true);h.set(nb,30);
      parts.push(h,data);const c=new Uint8Array(46+nb.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc32(data),true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,nb.length,true);cv.setUint32(42,offset,true);c.set(nb,46);centers.push(c);offset+=h.length+data.length;
    }
    if(files.length>65535)throw Error('Too many ZIP entries');const centralSize=centers.reduce((n,c)=>n+c.length,0);
    const tail=new Uint8Array(22),v=new DataView(tail.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    return new Blob([...parts,...centers,tail],{type:'application/zip'});
  }
  return {read,write,encode:s=>enc.encode(s),decode:b=>dec.decode(b),crc32};
})();