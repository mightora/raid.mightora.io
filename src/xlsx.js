const Spreadsheet = (()=>{
 const X='http://schemas.openxmlformats.org/spreadsheetml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('Spreadsheet contains invalid XML');return d;};
 const select=(parent,name)=>[...parent.getElementsByTagName('*')].filter(e=>e.localName===name);
 const child=(e,name)=>[...e.children].find(c=>c.localName===name);
 const str=e=>e?.textContent??'';
 const a1col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
 const colIdx=s=>{let x=0;for(const c of s.toUpperCase())x=x*26+c.charCodeAt(0)-64;return x-1;};
 const nameCol=s=>String(s).match(/^[A-Z]+/i)?.[0]||'A';
 const maxImportRows=20000;
 const escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
 function resolve(base,target){if(target.startsWith('/'))return target.slice(1);const arr=base.split('/');arr.pop();for(const s of target.split('/')){if(s==='..')arr.pop();else if(s!=='.')arr.push(s);}return arr.join('/');}
 function dateString(n){const x=new Date(Date.UTC(1899,11,30)+Number(n)*86400000);return Number.isNaN(x.getTime())?String(n):x.toISOString().slice(0,10);}
 function getCellValue(cell,strings){const t=cell.getAttribute('t')||'', v=str(child(cell,'v')),is=child(cell,'is');
   if(t==='s')return strings[Number(v)]??'';if(t==='inlineStr')return [...(is?select(is,'t'):[])].map(x=>x.textContent).join('');
   if(t==='b')return v==='1'?'TRUE':'FALSE';if(t==='e')return v; if(t==='str')return v;
   if(!v&&child(cell,'f'))return '';return v; }
 async function parse(file){if(file.size>25*1024*1024)throw Error('Please use a workbook smaller than 25 MB');const bytes=new Uint8Array(await file.arrayBuffer());const entries=await Zip.read(bytes);
   const wbData=entries.get('xl/workbook.xml');if(!wbData)throw Error('This does not appear to be an XLSX workbook');
   const book=xml(Zip.decode(wbData)),relationships=xml(Zip.decode(entries.get('xl/_rels/workbook.xml.rels')||Zip.encode('<Relationships/>')));
   const targets={};for(const rel of select(relationships,'Relationship'))targets[rel.getAttribute('Id')]=resolve('xl/workbook.xml',rel.getAttribute('Target')||'');
   const shared=[];if(entries.has('xl/sharedStrings.xml')){const sst=xml(Zip.decode(entries.get('xl/sharedStrings.xml')));for(const item of select(sst,'si'))shared.push(select(item,'t').map(str).join(''));}
   const sheets=[];for(const item of select(book,'sheet')){
     const name=item.getAttribute('name'),id=item.getAttributeNS(R,'id')||item.getAttribute('r:id');const path=targets[id];if(!path||!entries.has(path))continue;
     const sheet=xml(Zip.decode(entries.get(path)));const rows=[];
     for(const el of select(sheet,'row').slice(0,maxImportRows)){const cells={};for(const c of [...el.children].filter(e=>e.localName==='c')){const col=nameCol(c.getAttribute('r')||'');cells[col]=getCellValue(c,shared);}rows.push({number:Number(el.getAttribute('r'))||rows.length+1,cells});}
     sheets.push({name,path,rows,count:rows.length,truncated:select(sheet,'row').length>maxImportRows});
   }
   if(!sheets.length)throw Error('Workbook does not contain a readable worksheet');return {kind:'xlsx',entries,sheets,filename:file.name};
 }
 function parseCSV(text,separator){const lines=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===separator){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));lines.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell.replace(/\r$/,''));lines.push(row);}return lines;}
 async function parseFile(file){if(/\.csv$/i.test(file.name)){let text=await file.text();text=text.replace(/^\uFEFF/,'');const first=text.split('\n')[0];const delim=(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':',';const lines=parseCSV(text,delim);return {kind:'csv',sheets:[{name:'CSV Import',rows:lines.slice(0,maxImportRows).map((cells,i)=>({number:i+1,cells:Object.fromEntries(cells.map((v,j)=>[a1col(j),v]))})),count:lines.length}],filename:file.name};}
   if(/\.xlsx$/i.test(file.name))return parse(file);throw Error('Please choose an .xlsx or .csv file'); }
 function getHeaders(sheet,headerRow){const row=sheet.rows.find(r=>r.number===Number(headerRow));return row?Object.entries(row.cells).filter(([,v])=>String(v).trim()).map(([column,name])=>({column,name:String(name)})):[];}
 function scan(sheet){const sample=sheet.rows.slice(0,15);let best={headerRow:1,score:0};for(const r of sample){const headers=Object.values(r.cells);const score=headers.filter(h=>Model.guessColumn(h)).length; if(score>best.score)best={headerRow:r.number,score};}return best.headerRow;}
 function rowsToRecords(sheet,config){const header=Number(config.headerRow),first=Number(config.firstDataRow),last=Number(config.lastDataRow)||Infinity;return sheet.rows.filter(r=>r.number>=first&&r.number<=last).filter(r=>Object.values(r.cells).some(v=>String(v).trim())).map(row=>{
   const m=Model.makeRecord(row.cells,config.mapping,sheet.name,row.number);for(const f of ['due','reviewDate'])if(/^\d{4,6}(\.\d+)?$/.test(String(m[f]||'')))m[f]=dateString(m[f]);
   if(!config.mapping.type)m.type=config.type||Model.detectType('',sheet.name);return m;
 });}
 function updateCell(doc,rowEl,ref,val){let cells=[...rowEl.children].filter(e=>e.localName==='c');let c=cells.find(e=>e.getAttribute('r')===ref);if(!c){c=doc.createElementNS(X,'c');c.setAttribute('r',ref);let inserted=false;for(const current of cells){if(colIdx(nameCol(current.getAttribute('r')))>colIdx(nameCol(ref))){rowEl.insertBefore(c,current);inserted=true;break;}}if(!inserted)rowEl.appendChild(c);}
   // Write literal text as inline strings to eliminate formula injection.
   while(c.firstChild)c.removeChild(c.firstChild);c.setAttribute('t','inlineStr');const is=doc.createElementNS(X,'is'),t=doc.createElementNS(X,'t');t.setAttribute('xml:space','preserve');t.textContent=String(val??'');is.appendChild(t);c.appendChild(is);
 }
 function patchSheet(original,records,config,extra){const doc=xml(Zip.decode(original));const data=child(doc.documentElement,'sheetData');if(!data)throw Error('Worksheet has no sheetData element');const map=config.mapping||{},rev={};for(const [c,f] of Object.entries(map))if(f)rev[f]=c;
   const used=Object.keys(map).map(colIdx).filter(n=>n>=0),newColumns={};let next=Math.max(-1,...used);
   for(const f of extra||[])if(!rev[f])newColumns[f]=a1col(++next);
   const rowByNumber=new Map([...data.children].filter(x=>x.localName==='row').map(r=>[Number(r.getAttribute('r')),r]));
   let header=rowByNumber.get(Number(config.headerRow));if(header){for(const [f,c] of Object.entries(newColumns))updateCell(doc,header,`${c}${config.headerRow}`,Model.FIELDS[f]||f);}
   for(const record of records){const row=rowByNumber.get(Number(record._row));if(!row)continue;
     for(const [f,val] of Object.entries(record._updated||{})){const c=rev[f]||newColumns[f];if(c)updateCell(doc,row,`${c}${record._row}`,val);}
     for(const [f,c] of Object.entries(newColumns))if(record[f]!==undefined&&record[f]!=='')updateCell(doc,row,`${c}${record._row}`,record[f]);
   }
   return Zip.encode(new XMLSerializer().serializeToString(doc));}
 async function exportOriginal(state){if(!state.source)throw Error('No imported workbook');if(state.source.kind==='csv')return writeCSV(state.records,state.source,state.configs,state.exportColumns||[]);
   const entries=new Map(state.source.entries);for(const sheet of state.source.sheets){const cfg=state.configs[sheet.name];if(!cfg||!cfg.include)continue;const records=state.records.filter(r=>r._sheet===sheet.name);entries.set(sheet.path,patchSheet(entries.get(sheet.path),records,cfg,state.exportColumns||[]));}
   return Zip.write(entries);
 }
 function writeCSV(records,source,configs,extra=[]){const sheet=source.sheets[0];const cfg=configs[sheet.name];const rows=sheet.rows.map(r=>({...r.cells}));for(const r of records){const row=rows[r._row-1];if(!row)continue;for(const [field,v] of Object.entries(r._updated||{})){let col=Object.keys(cfg.mapping).find(c=>cfg.mapping[c]===field);if(col)row[col]=v;}}
      const colCount=Math.max(...rows.map(r=>Object.keys(r).reduce((n,c)=>Math.max(n,colIdx(c)),0)))+1;const rev=new Set(Object.values(cfg.mapping));const added=extra.filter(f=>!rev.has(f));for(let i=0;i<added.length;i++){const c=a1col(colCount+i);const heading=rows[Number(cfg.headerRow)-1];if(heading)heading[c]=Model.FIELDS[added[i]]||added[i];for(const r of records){if(!r._row||r._sheet!==sheet.name)continue;const dest=rows[r._row-1];if(dest&&r[added[i]]!==undefined)dest[c]=r[added[i]];}}const width=colCount+added.length;
   const csv=rows.map(r=>Array.from({length:width},(_,i)=>{const v=String(r[a1col(i)]??'');return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\r\n');return new Blob(['\uFEFF',csv],{type:'text/csv'}); }
 const workbookRels=n=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({length:n},(_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`;
 function newWorkbook(sheets){const entries={};const names=Object.keys(sheets);entries['[Content_Types].xml']=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
   entries['_rels/.rels']='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
   entries['xl/_rels/workbook.xml.rels']=workbookRels(names.length);
   entries['xl/workbook.xml']=`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${X}" xmlns:r="${R}"><sheets>${names.map((n,i)=>`<sheet name="${escape(n.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
   names.forEach((name,i)=>{const rows=sheets[name]||[];const max=Math.max(1,...rows.map(r=>r.length));const cells=rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>`<c r="${a1col(ci)}${ri+1}" t="inlineStr"><is><t xml:space="preserve">${escape(v)}</t></is></c>`).join('')}</row>`).join('');
     entries[`xl/worksheets/sheet${i+1}.xml`]=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${X}"><dimension ref="A1:${a1col(max-1)}${Math.max(1,rows.length)}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="17"/><cols>${Array.from({length:max},(_,j)=>`<col min="${j+1}" max="${j+1}" width="${j===2?50:22}" customWidth="1"/>`).join('')}</cols><sheetData>${cells}</sheetData>${rows.length>1?`<autoFilter ref="A1:${a1col(max-1)}${rows.length}"/>`:''}</worksheet>`;
   });return Zip.write(entries);
 }
 function exportEnhanced(state){const sheets={};const base=['id','type','title','description','owner','status','priority','impact','likelihood','due','workstream','category','mitigation','reviewDate','evidence','decision'];const fields=[...base,...(state.exportColumns||[]).filter(f=>!base.includes(f))];
   sheets['Summary']=[['Mightora RAAIDD · Enhanced export'],['Source',state.source?.filename||'Sample register'],['Generated',new Date().toISOString()],['Records',state.records.length],['Note','Review comments are maintained separately from source records']];
   for(const type of Model.TYPES){const rows=state.records.filter(r=>r.type===type);const typedFields=[...new Set([...fields,...(Model.SPECIAL[type]||[])])];sheets[type==='Dependency'?'Dependencies':`${type}s`.slice(0,31)]=[typedFields.map(f=>Model.FIELDS[f]||f),...rows.map(r=>typedFields.map(f=>r[f]??''))];}
   sheets['Review comments']=[['Record ID','Record title','Author','Date','Kind','Comment'],...state.records.flatMap(r=>(r._comments||[]).map(c=>[r.id,r.title,c.author,c.date,c.kind,c.text]))];
   sheets['Relationships']=[['Source ID','Relationship','Target ID'],...state.records.flatMap(r=>(r._relationships||[]).map(l=>[r.id,l.type,l.target]))];
   return newWorkbook(sheets);
 }
 return {parseFile,getHeaders,scan,rowsToRecords,exportOriginal,exportEnhanced,newWorkbook,colIdx,a1col,escape};
})();