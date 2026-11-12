/* Dedicated Report relay. Never install this code into the CONTACT project.
 * Required script properties: REPORT_RELAY_SECRET (>=32 chars), ARCHIVE_RECIPIENT.
 * PdfLibrary.gs is generated locally by node scripts/build-report-relay.mjs.
 * No customer bodies, passwords, permits or full signatures are logged/stored here.
 */
function reportCanonical_(v) {
  if(v===null || typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(reportCanonical_).join(',')+']';
  return '{'+Object.keys(v).filter(function(k){return v[k]!==undefined}).sort().map(function(k){return JSON.stringify(k)+':'+reportCanonical_(v[k])}).join(',')+'}';
}
function reportHex_(bytes){return bytes.map(function(n){return ('0'+(n&255).toString(16)).slice(-2)}).join('')}
function reportHash_(data){return reportHex_(typeof data==='string'?Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,data,Utilities.Charset.UTF_8):Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,data))}
function reportMac_(secret,data,domain){return reportHex_(Utilities.computeHmacSha256Signature(domain+'\n'+reportCanonical_(data),secret,Utilities.Charset.UTF_8))}
function reportEqual_(a,b){if(typeof a!=='string'||typeof b!=='string')return false;var diff=a.length^b.length;for(var i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function reportReply_(secret,payload){return ContentService.createTextOutput(JSON.stringify({version:1,payload:payload,signature:reportMac_(secret,payload,'response')})).setMimeType(ContentService.MimeType.JSON)}
function reportFail_(code){throw new Error(code)}
function reportOnly_(data,keys){if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(function(k){return keys.indexOf(k)<0}))reportFail_('invalid_request')}
function reportPrune_(props,now){
  var all=props.getProperties();
  Object.keys(all).forEach(function(k){
    if(k.indexOf('op:')===0){try{var v=JSON.parse(all[k]);if(now-v.updatedAt>7*86400000&&['SENT_UNVERIFIED','PREPARED','FAILED','CONFIRMED'].indexOf(v.status)>=0){props.deleteProperty(k);delete all[k]}}catch(ignore){}}
    if(k.indexOf('daily:')===0&&now-Number(all[k].split(':')[1])>2*86400000){props.deleteProperty(k);delete all[k]}
  });
  // Leave room below the 500 KB Script Properties store limit. Unknown operations are never pruned.
  var length=Object.keys(all).reduce(function(n,k){return n+k.length+all[k].length},0);
  if(length>210000)reportFail_('journal_full');
}
function reportImageSize_(bytes,mime){
  var b=bytes.map(function(n){return n&255});
  if(mime==='image/png'){
    if(b.length<33||b.slice(0,8).join(',')!=='137,80,78,71,13,10,26,10'||b.slice(-8,-4).join(',')!=='73,69,78,68')reportFail_('photo_format');
    return [b[16]*16777216+b[17]*65536+b[18]*256+b[19],b[20]*16777216+b[21]*65536+b[22]*256+b[23]];
  }
  if(mime!=='image/jpeg'||b[0]!==255||b[1]!==216||b[b.length-2]!==255||b[b.length-1]!==217)reportFail_('photo_format');
  for(var i=2;i<b.length-8;){
    if(b[i++]!==255)reportFail_('photo_format');while(b[i]===255)i++;var marker=b[i++];
    if(marker===218||marker===217)break;
    var size=b[i]*256+b[i+1];if(size<2||i+size>b.length)reportFail_('photo_format');
    if([192,193,194,195,197,198,199,201,202,203,205,206,207].indexOf(marker)>=0)return[b[i+5]*256+b[i+6],b[i+3]*256+b[i+4]];
    i+=size;
  }
  reportFail_('photo_format');
}
function reportFiles_(text){
  if(typeof text!=='string'||text.length>150000)reportFail_('archive_limits');
  var portable=JSON.parse(text),r=portable.report;
  if(portable.format!=='KH-Tech Report'||portable.version!==1||!r||!/^KHT-\d{8}-[A-F0-9]{6}$/.test(r.id)||!r.approval||r.approval.revision!==r.revision||portable.integrity.algorithm!=='SHA-256')reportFail_('archive_format');
  var payload={format:portable.format,version:portable.version,report:r,totals:portable.totals};
  if(reportHash_(reportCanonical_(payload))!==portable.integrity.value||text!==reportCanonical_(portable)+'\n')reportFail_('archive_integrity');
  var bytes=Array.from(new Uint8Array(KhReportPdf.buildFinalPdf(portable).output('arraybuffer')),function(n){return n>127?n-256:n});
  var jsonBytes=Utilities.newBlob(text).getBytes();
  if(bytes.length+jsonBytes.length>2000000)reportFail_('archive_limits');
  return {report:r,attachments:[Utilities.newBlob(bytes,'application/pdf',r.id+'_r'+r.revision+'.pdf'),Utilities.newBlob(jsonBytes,'application/vnd.kh-tech.report+json',r.id+'_r'+r.revision+'.khtreport')],pdfSha256:reportHash_(bytes),portableSha256:reportHash_(jsonBytes),snapshotHash:portable.integrity.value};
}
function doPost(e){
  var props=PropertiesService.getScriptProperties(),secret=props.getProperty('REPORT_RELAY_SECRET')||'',operationId='',locked=false,attempted=false,record=null,hadRecord=false;
  try {
    var raw=e&&e.postData&&e.postData.contents;if(typeof raw!=='string'||raw.length>2800000||secret.length<32)reportFail_('unauthorized');
    var envelope=JSON.parse(raw);reportOnly_(envelope,['version','payload','signature','photos']);
    var p=envelope.payload;operationId=p&&p.operationId;
    if(envelope.version!==1||!p||typeof operationId!=='string'||!/^[A-Za-z0-9-]{10,150}$/.test(operationId)||!reportEqual_(envelope.signature,reportMac_(secret,p,'request'))||!Number.isSafeInteger(p.issuedAt)||!Number.isSafeInteger(p.expiresAt)||p.expiresAt-p.issuedAt>300000||p.issuedAt>Date.now()+30000||p.expiresAt<Date.now())reportFail_('unauthorized');
    var action=p.action;
    var allowed={status:['action','operationId','issuedAt','expiresAt'],receipt:['action','operationId','issuedAt','expiresAt'],prepare:['action','operationId','portable','issuedAt','expiresAt'],archive:['action','operationId','portable','issuedAt','expiresAt'],photos:['action','operationId','reportId','revision','manifest','issuedAt','expiresAt']};
    if(!allowed[action])reportFail_('invalid_request');reportOnly_(p,allowed[action]);
    var lock=LockService.getScriptLock();if(!lock.tryLock(18000))return reportReply_(secret,{operationId:operationId,status:'OUTCOME_UNKNOWN',error:'busy'});locked=true;
    var key='op:'+operationId,stored=props.getProperty(key);record=stored?JSON.parse(stored):null;hadRecord=!!record;
    if(action==='status'||action==='receipt'){
      if(action==='receipt'){record=record||{operationId:operationId,intent:'sealed-by-verified-receipt'};record.status='CONFIRMED';record.updatedAt=Date.now();props.setProperty(key,JSON.stringify(record));return reportReply_(secret,{operationId:operationId,status:'PREPARED'})}
      if(!record)return reportReply_(secret,{operationId:operationId,status:'OUTCOME_UNKNOWN',error:'record_not_found'});
      return reportReply_(secret,Object.assign({},record,{operationId:operationId,status:record.status==='SENDING'||record.status==='CONFIRMED'?'OUTCOME_UNKNOWN':record.status}));
    }
    var intent=reportHash_(reportCanonical_({action:action,operationId:operationId,portable:p.portable||'',reportId:p.reportId||'',revision:p.revision||0,manifest:p.manifest||[]}));
    if(record){if(record.intent!==intent)reportFail_('request_conflict');return reportReply_(secret,Object.assign({},record,{operationId:operationId,status:record.status==='SENDING'||record.status==='CONFIRMED'?'OUTCOME_UNKNOWN':record.status}))}
    reportPrune_(props,Date.now());
    var files=null,attachments=[],photoHashes=[],reportId='',revision=0;
    if(action==='archive'||action==='prepare'){
      files=reportFiles_(p.portable);attachments=files.attachments;reportId=files.report.id;revision=files.report.revision;
    } else {
      if(!/^KHT-\d{8}-[A-F0-9]{6}$/.test(p.reportId)||!Number.isSafeInteger(p.revision)||!Array.isArray(p.manifest)||p.manifest.length<1||p.manifest.length>6||!Array.isArray(envelope.photos)||envelope.photos.length!==p.manifest.length)reportFail_('photo_limits');
      var total=0;reportId=p.reportId;revision=p.revision;
      p.manifest.forEach(function(m,index){
        reportOnly_(m,['sha256','bytes','width','height','mime','category']);
        if(['image/jpeg','image/png'].indexOf(m.mime)<0||['before','during','after'].indexOf(m.category)<0||!Number.isInteger(m.bytes)||m.bytes<32||m.bytes>1200000||m.width<1||m.height<1||m.width>2000||m.height>2000||typeof envelope.photos[index]!=='string'||envelope.photos[index].length>1600010||!/^[A-Za-z0-9+/]*={0,2}$/.test(envelope.photos[index]))reportFail_('photo_limits');
        var bytes=Utilities.base64Decode(envelope.photos[index]);total+=bytes.length;
        if(bytes.length!==m.bytes||total>2000000||reportHash_(bytes)!==m.sha256)reportFail_('photo_integrity');
        var size=reportImageSize_(bytes,m.mime);if(size[0]!==m.width||size[1]!==m.height)reportFail_('photo_dimensions');
        photoHashes.push(m.sha256);attachments.push(Utilities.newBlob(bytes,m.mime,reportId+'_'+m.category+'_'+(index+1)+(m.mime==='image/jpeg'?'.jpg':'.png')));
      });
    }
    record={operationId:operationId,intent:intent,status:action==='prepare'?'PREPARED':'SENDING',updatedAt:Date.now()};
    if(files){record.pdfSha256=files.pdfSha256;record.portableSha256=files.portableSha256;record.snapshotHash=files.snapshotHash}
    if(photoHashes.length)record.photoHashes=photoHashes;
    if(action==='prepare'){props.setProperty(key,JSON.stringify(record));return reportReply_(secret,record)}
    var recipient=props.getProperty('ARCHIVE_RECIPIENT')||'';
    // The destination is installation-owned, never supplied by a caller.
    if(recipient!=='khtech.site@gmail.com')reportFail_('recipient_configuration');
    var cap=Number(props.getProperty('ARCHIVE_DAILY_CAP')||'40');
    if(!Number.isInteger(cap)||cap<1||cap>90)reportFail_('quota_configuration');
    var dayKey='daily:'+new Date().toISOString().slice(0,10),daily=props.getProperty(dayKey),count=daily?Number(daily.split(':')[0]):0;
    if(count>=cap||MailApp.getRemainingDailyQuota()<1)reportFail_('quota');
    props.setProperty(dayKey,String(count+1)+':'+Date.now());
    props.setProperty(key,JSON.stringify(record)); // Durable marker BEFORE the external side effect.
    attempted=true;
    MailApp.sendEmail({to:recipient,subject:(action==='photos'?'KH-Tech työkuvat ':'KH-Tech hyväksytty työraportti ')+reportId+' / versio '+revision,body:'Raportti '+reportId+', versio '+revision+'.\n'+(action==='photos'?'Erilliset paikalliset työkuvat.':'Hyväksytty PDF ja siirrettävä .khtreport. Tarkista molemmat liitteet ennen pilvitietojen poistamista.'),attachments:attachments,name:'KH-Tech Report'});
    record.status='SENT_UNVERIFIED';record.updatedAt=Date.now();props.setProperty(key,JSON.stringify(record));
    return reportReply_(secret,record);
  } catch(error) {
    if(secret.length<32||!operationId||String(error.message)==='unauthorized')return ContentService.createTextOutput('{"error":"unauthorized"}').setMimeType(ContentService.MimeType.JSON);
    if(hadRecord)return reportReply_(secret,{operationId:operationId,status:'OUTCOME_UNKNOWN',error:'request_conflict'});
    var status=attempted?'OUTCOME_UNKNOWN':'FAILED',result=Object.assign({},record||{},{operationId:operationId,status:status,error:attempted?'mail_outcome_unknown':String(error.message).slice(0,80),updatedAt:Date.now()});
    if(locked){try{props.setProperty('op:'+operationId,JSON.stringify(result))}catch(ignore){}}
    return reportReply_(secret,result);
  } finally {if(locked)lock.releaseLock()}
}
