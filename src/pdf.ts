import { jsPDF } from 'jspdf';
type ReportPhoto=string|{data:string;category?:string};
export function buildPdf({id,form,photos}:{id:string;form:Record<string,any>;photos:ReportPhoto[]}){
  const doc=new jsPDF({format:'a4',unit:'mm'});const pageW=210;let y=20;
  const navy='#102b46',blue='#1688b5',muted='#657483';
  const header=(title:string)=>{doc.setFillColor(navy);doc.rect(0,0,pageW,34,'F');doc.setTextColor('#ffffff');doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('KH-TECH OY',15,16);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('LVI-PALVELUT  ·  TYÖRAPORTTI',15,23);doc.setFontSize(10);doc.text(id,pageW-15,16,{align:'right'});doc.setTextColor(navy);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(title,15,47);doc.setDrawColor(blue);doc.setLineWidth(1);doc.line(15,51,pageW-15,51);y=61};
  const footer=()=>{const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(muted);doc.text(`KH-Tech Oy · ${id}`,15,286);doc.text(`${i} / ${n}`,pageW-15,286,{align:'right'})}};
  const section=(label:string,content:string)=>{if(y>265){doc.addPage();header('Työraportti – jatkuu')}doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(blue);doc.text(label.toLocaleUpperCase('fi-FI'),15,y);y+=6;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(navy);const lines=doc.splitTextToSize(content||'—',pageW-30);doc.text(lines,15,y);y+=Math.max(7,lines.length*5)+5};
  header('Työraportti');doc.setFontSize(10);doc.setTextColor(muted);doc.text(`Raporttitunnus: ${id}`,15,y);doc.text(`Päivä: ${form.date||new Date().toLocaleDateString('fi-FI')}`,pageW-15,y,{align:'right'});y+=10;
  section('Asiakas ja kohde',[form.customer,form.address,form.city,form.reference?`Viite: ${form.reference}`:''].filter(Boolean).join('\n'));
  section('Työntekijä ja työaika',[form.worker,form.start||form.end?`Työaika ${form.start||'—'}–${form.end||'—'}`:''].filter(Boolean).join('\n'));
  section('Palvelu ja työtunnit',[form.service,form.hours?`Työtunnit: ${form.hours}`:''].filter(Boolean).join('\n'));
  section('Työn kuvaus',form.description);section('Tehdyt työvaiheet',form.tasks);
  const mats=(form.materials||[]).filter((m:any)=>m.name||m.quantity).map((m:any)=>`${m.name||'Materiaali'} — ${m.quantity||''} ${m.unit||''}`.trim()).join('\n');section('Materiaalit ja määrät',mats);
  section('Lisähuomiot',form.notes);section('Jatkotoimet',form.followup);if(form.acknowledgement)section('Asiakkaan kuittaus',form.acknowledgement);
  photos.forEach((photo,i)=>{const data=typeof photo==='string'?photo:photo.data;const type=typeof photo==='string'?'during':photo.category||'during';const label=type==='before'?'Ennen työtä':type==='after'?'Työn jälkeen':'Työn aikana';doc.addPage();header(`${label} – kuva ${i+1}`);try{const props=doc.getImageProperties(data);const maxW=pageW-30,maxH=215;const ratio=Math.min(maxW/props.width,maxH/props.height);const w=props.width*ratio,h=props.height*ratio;doc.addImage(data,props.fileType||'JPEG',15,62,w,h)}catch{doc.setFontSize(10);doc.text('Kuvan lisääminen ei onnistunut.',15,65)}});
  footer();return doc;
}
export function createPdf(input:{id:string;form:Record<string,any>;photos:ReportPhoto[]}){buildPdf(input).save(`KH-Tech_Tyoraportti_${input.id}.pdf`);return input.id}
