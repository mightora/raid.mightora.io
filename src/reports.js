const Reports=(()=>{
 const esc=Spreadsheet.escape;
 const para=(s,style='Normal')=>`<w:p><w:pPr><w:pStyle w:val="${style}"/><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t xml:space="preserve">${esc(s)}</w:t></w:r></w:p>`;
 const cell=(s,width)=>`<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>${para(s)}</w:tc>`;
 const table=(heads,rows)=>{const widths=heads.length===6?[1050,1180,3410,1530,1200,880]:heads.length===5?(heads.includes('Type')?[1050,1460,3350,1770,1370]:[1050,3450,1630,1310,1560]):heads.map(()=>Math.floor(9250/heads.length));
   const row=(values,isHeader=false)=>`<w:tr><w:trPr><w:cantSplit/>${isHeader?'<w:tblHeader/>':''}</w:trPr>${values.map((v,i)=>cell(String(v??''),widths[i]||1200)).join('')}</w:tr>`;
   return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(x=>`<w:${x} w:val="single" w:sz="4" w:color="D7E1E8"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${row(heads,true)}${rows.map(v=>row(v)).join('')}</w:tbl>`;
 };
 function selectTop(records){return records.filter(r=>!Model.closed(r)).sort((a,b)=>(Model.score(b)||0)-(Model.score(a)||0)||Number(Model.overdue(b))-Number(Model.overdue(a)));}
 function docx(state,opts={}){
   const records=state.records, m=Model.metrics(records),top=selectTop(records),today=new Date().toLocaleDateString('en-GB');
   const parts=[para(opts.title||'RAAIDD Governance & Assurance Report','Title'),para(`${state.source?.filename||'Example register'}  ·  ${today}`,'Subtitle')];
   const include=(s)=>!opts.sections||opts.sections.includes(s);
   if(include('summary')){parts.push(para('Executive overview','Heading1'));parts.push(para(`${m.total} records; ${m.open} open; ${m.high} high-rated active risks; ${m.overdue} overdue items; average record quality ${m.health}%.`));parts.push(para('This report reflects the information captured in the supplied register. Missing or incomplete fields should not be interpreted as no exposure.'));}
   if(include('risks')){parts.push(para('Priority risks and issues','Heading1'));parts.push(table(['ID','Category','Title','Owner','Status','Score'],top.filter(r=>r.type==='Risk'||r.type==='Issue').slice(0,20).map(r=>[r.id,r.type,r.title,r.owner,r.status,Model.score(r)??'Not scored'])));}
   if(include('decisions')){parts.push(para('Decisions and dependencies','Heading1'));parts.push(table(['ID','Type','Decision / dependency','Owner','Due'],records.filter(r=>['Decision','Dependency'].includes(r.type)).slice(0,30).map(r=>[r.id,r.type,r.title,r.owner,r.due])));}
   if(include('actions')){parts.push(para('Actions and follow-up','Heading1'));parts.push(table(['ID','Action','Owner','Due','Status'],records.filter(r=>r.type==='Action'||Model.overdue(r)).slice(0,35).map(r=>[r.id,r.title,r.owner,r.due,r.status])));}
   if(include('evidence')){parts.push(para('Assurance findings and reviewer comments','Heading1'));for(const r of records.filter(r=>r._comments?.length||Model.assess(r).score<60).slice(0,30)){
     parts.push(para(`${r.id}: ${r.title}`,'Heading2'));parts.push(para(`Record quality ${Model.assess(r).score}%. ${Model.assess(r).gaps.length?'Gaps: '+Model.assess(r).gaps.join('; '):'No standard management gaps detected.'}`));
     for(const c of r._comments||[])parts.push(para(`${c.kind} · ${c.author||'Reviewer'} · ${c.date}: ${c.text}`));}}
   if(include('appendix')){for(const type of Model.TYPES){const group=records.filter(r=>r.type===type);if(!group.length)continue;parts.push(para(type+'s','Heading1'));parts.push(table(['Reference','Title / description','Owner','Status','Due'],group.slice(0,200).map(r=>[r.id,r.title,r.owner,r.status,r.due])));}}
   const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${parts.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1140" w:right="960" w:bottom="1140" w:left="960" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
   const styles=`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="20"/><w:color w:val="20364C"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="42"/><w:color w:val="173A52"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:sz w:val="24"/><w:color w:val="487591"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="260" w:after="140"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="173A52"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="2B5B81"/></w:rPr></w:style></w:styles>`;
   return Zip.write({'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
     '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
     'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
     'word/document.xml':document,'word/styles.xml':styles});
 }
 const decodeBase64=s=>{const text=atob(s),b=new Uint8Array(text.length);for(let i=0;i<text.length;i++)b[i]=text.charCodeAt(i);return b;};
 function fillReplacements(state,opts){const m=Model.metrics(state.records),today=new Date().toLocaleDateString('en-GB'),sort=selectTop(state.records);
   const records=state.records.filter(r=>r.type==='Risk'&&!Model.closed(r));const rep={S1_TITLE:(opts.title||'RAAIDD Governance Review').slice(0,72),S1_SUBTITLE:(state.source?.filename||'Example register').slice(0,100),S1_DATE:today,
     S2_KPI_0:m.total,S2_KPI_1:m.open,S2_KPI_2:m.high,S2_KPI_3:m.overdue,S2_KPI_4:m.health+'%',S2_HEADLINE:`${m.open} open records across six RAAIDD categories`,S2_NOTE:`${m.high} high-rated active risks, ${m.overdue} overdue items and ${m.decisions} active decisions. Figures use available imported data.`,
     S3_COUNT:`${records.length} active risks`,S6_HEADLINE:`Average record quality: ${m.health}%`};
   for(let likelihood=1;likelihood<=5;likelihood++)for(let impact=1;impact<=5;impact++)rep[`H_${likelihood}_${impact}`]=records.filter(r=>Number(r.likelihood)===likelihood&&Number(r.impact)===impact).length;
   for(let i=0;i<5;i++){const r=sort[i];rep[`S4_ID_${i}`]=r?.id||'—';rep[`S4_TITLE_${i}`]=(r?.title||'No additional item').slice(0,90);rep[`S4_DETAIL_${i}`]=r?`${r.type} · ${r.owner||'No owner'} · ${r.status||'No status'}${Model.overdue(r)?' · OVERDUE':''}`:' ';}
   const decisions=sort.filter(r=>r.type==='Decision'),actions=sort.filter(r=>r.type==='Action'||Model.overdue(r));for(let i=0;i<4;i++){rep[`S5_DEC_${i}`]=(decisions[i]?`${decisions[i].id}: ${decisions[i].title}`:'—').slice(0,96);rep[`S5_ACT_${i}`]=(actions[i]?`${actions[i].id}: ${actions[i].title}`:'—').slice(0,94);}
   const gaps=sort.map(r=>({r,q:Model.assess(r)})).sort((a,b)=>a.q.score-b.q.score).slice(0,4);for(let i=0;i<4;i++)rep[`S6_FIND_${i}`]=(gaps[i]?`${gaps[i].r.id} · ${gaps[i].q.score}% quality · Missing: ${gaps[i].q.gaps.slice(0,2).join(', ')}`:'No additional recorded finding').slice(0,135);
   return rep;
 }
 async function pptx(state,opts={}){const entries=await Zip.read(decodeBase64(PPTX_TEMPLATE_BASE64)),repl=fillReplacements(state,opts);
   for(const [path,bytes] of entries){if(!/^ppt\/slides\/slide\d+\.xml$/.test(path))continue;let source=Zip.decode(bytes);source=source.replace(/\{\{([A-Z0-9_]+)\}\}/g,(_,key)=>esc(repl[key]??''));entries.set(path,Zip.encode(source));}
   const sections=opts.sections||['summary','risks','decisions','actions','evidence'];
   const keep=new Set([1, ...(sections.includes('summary')?[2]:[]),...(sections.includes('risks')?[3,4]:[]),...(sections.includes('decisions')||sections.includes('actions')?[5]:[]),...(sections.includes('evidence')?[6]:[])]);
   if(keep.size<6){
     const parse=content=>new DOMParser().parseFromString(Zip.decode(content),'application/xml'),serialize=doc=>Zip.encode(new XMLSerializer().serializeToString(doc));
     const pres=parse(entries.get('ppt/presentation.xml')),rels=parse(entries.get('ppt/_rels/presentation.xml.rels')),types=parse(entries.get('[Content_Types].xml'));
     for(const rel of [...rels.getElementsByTagName('*')].filter(e=>e.localName==='Relationship')){
       const n=Number((rel.getAttribute('Target')||'').match(/slides\/slide(\d+)\.xml$/)?.[1]);
       if(!n||keep.has(n))continue;const rid=rel.getAttribute('Id');rel.remove();
       for(const sid of [...pres.getElementsByTagName('*')].filter(e=>e.localName==='sldId'))if(sid.getAttribute('r:id')===rid||[...sid.attributes].some(a=>a.localName==='id'&&a.value===rid))sid.remove();
       entries.delete(`ppt/slides/slide${n}.xml`);entries.delete(`ppt/slides/_rels/slide${n}.xml.rels`);
       for(const item of [...types.getElementsByTagName('*')].filter(e=>e.localName==='Override'))if(item.getAttribute('PartName')===`/ppt/slides/slide${n}.xml`)item.remove();
     }
     entries.set('ppt/presentation.xml',serialize(pres));entries.set('ppt/_rels/presentation.xml.rels',serialize(rels));entries.set('[Content_Types].xml',serialize(types));
   }
   return Zip.write(entries);
 }
 return {docx,pptx};
})();