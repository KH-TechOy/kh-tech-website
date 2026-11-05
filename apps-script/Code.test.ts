import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';

function scriptHarness(){
  let now=0;const cache=new Map<string,{value:string;expires:number}>();const sent:Array<Record<string,unknown>>=[];
  const context:any={
    PropertiesService:{getScriptProperties:()=>({getProperty:(key:string)=>({RECIPIENT_EMAIL:'internal@example.test',STAFF_PASSWORD:'a-test-only-strong-passphrase'} as Record<string,string>)[key]||null})},
    CacheService:{getScriptCache:()=>({get:(key:string)=>{const item=cache.get(key);return item&&item.expires>now?item.value:null},put:(key:string,value:string,ttl:number)=>cache.set(key,{value,expires:now+ttl*1000}),remove:(key:string)=>cache.delete(key)})},
    Session:{getTemporaryActiveUserKey:()=> 'test-user'},
    LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
    MailApp:{sendEmail:(mail:Record<string,unknown>)=>sent.push(mail)},
    Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},computeDigest:(_algorithm:string,value:string)=>Array.from(value).map(c=>c.charCodeAt(0)),getUuid:()=> '12345678-1234-1234-1234-123456789012',formatDate:()=> '2026110500',base64Decode:()=>[37,80,68,70],newBlob:(bytes:number[],type:string,name:string)=>({bytes,type,name})},
    __advance:(ms:number)=>{now+=ms},__sent:sent,
  };
  const code=readFileSync(resolve(process.cwd(),'apps-script/Code.gs'),'utf8');runInNewContext(code,context);return context;
}
const contact={name:'Aino Esimerkki',email:'aino@example.fi',phone:'',location:'Lohja',service:'Huolto',urgency:'urgent',method:'email',description:'Putkivuoto keittiössä',consent:'on',honey:''};
const report={id:'KHT-20261105-ABCDEF',city:'Lohja',date:'2026-11-05',pdfBase64:'JVBERi0='};
describe('Apps Script backend guards',()=>{
  it('formats a contact email and accepts only after MailApp returns',()=>{const app=scriptHarness();expect(app.submitContact(contact)).toEqual({accepted:true});const mail=app.__sent[0];expect(mail.to).toBe('internal@example.test');expect(mail.subject).toContain('[KH-Tech][TYÖPYYNTÖ][KIIREELLINEN] Aino Esimerkki – Lohja');expect(mail.body).toContain('Putkivuoto keittiössä')});
  it('rejects unauthenticated report access',()=>{const app=scriptHarness();expect(()=>app.emailReport(report,'invalid')).toThrow('Kirjautuminen on vanhentunut')});
  it('rejects a report after the server session expires',()=>{const app=scriptHarness();const session=app.login('a-test-only-strong-passphrase');app.__advance(1800001);expect(()=>app.emailReport(report,session.token)).toThrow('Kirjautuminen on vanhentunut')});
  it('rejects missing consent before email delivery',()=>{const app=scriptHarness();expect(()=>app.submitContact({...contact,consent:''})).toThrow('tietosuojatietoja ei ole kuitattu');expect(app.__sent).toHaveLength(0)});
});
