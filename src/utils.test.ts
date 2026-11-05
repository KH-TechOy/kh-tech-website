import {describe,it,expect} from 'vitest';
import {createReportId,resolveRoute,validateContact} from './utils';
const good={name:'Aino',email:'aino@example.fi',phone:'',location:'Lohja',service:'',urgency:'normal',method:'email',description:'Vesihana vuotaa',consent:true,honey:''};
describe('contact validation',()=>{it('accepts a valid request',()=>expect(validateContact(good)).toBe(''));it('requires a contact method',()=>expect(validateContact({...good,email:''})).toContain('sähköpostiosoite'));it('rejects invalid email',()=>expect(validateContact({...good,email:'bad'})).toContain('sähköpostiosoite'));it('rejects spam honeypot',()=>expect(validateContact({...good,honey:'bot'})).not.toBe(''))});
describe('report identifier',()=>{it('uses searchable date format',()=>expect(createReportId(new Date(2026,10,5),0xabcdef)).toBe('KHT-20261105-ABCDEF'))});
describe('GitHub Pages routing',()=>{it('resolves direct route entrypoints under a project base',()=>expect(resolveRoute('/kh-tech-website/report/','/kh-tech-website/')).toBe('/report'));it('resolves the project home page',()=>expect(resolveRoute('/kh-tech-website/','/kh-tech-website/')).toBe('/'))});
