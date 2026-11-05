/** KH-Tech Apps Script draft. Deploy only after reviewing DEPLOYMENT.md. */
const SESSION_TTL_SECONDS = 1800;
const MAX_REPORT_BYTES = 7 * 1024 * 1024;
const MAX_TEXT_LENGTH = 12000;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('KH-Tech – suojattu lähetys')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function submitContact(form) {
  const p = PropertiesService.getScriptProperties();
  const recipient = requiredProperty_(p, 'RECIPIENT_EMAIL');
  validateContact_(form);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const cache = CacheService.getScriptCache();
    const key = 'contact-window-' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
    const count = Number(cache.get(key) || 0);
    if (count >= 30) throw new Error('Pyyntöjä ei voitu käsitellä juuri nyt. Yritä myöhemmin tai soita yritykselle.');
    cache.put(key, String(count + 1), 3600);
  } finally { lock.releaseLock(); }
  const urgency = ({normal:'NORMAALI',soon:'PIAN',urgent:'KIIREELLINEN'})[form.urgency] || 'NORMAALI';
  const subject = `[KH-Tech][TYÖPYYNTÖ][${urgency}] ${clean_(form.name,120)} – ${clean_(form.location,120) || 'Sijainti ilmoittamatta'}`;
  const body = [
    'Uusi yhteydenottopyyntö KH-Techin sivustolta.', '',
    `Nimi: ${clean_(form.name,120)}`, `Sähköposti: ${clean_(form.email,160)}`,
    `Puhelin: ${clean_(form.phone,40)}`, `Sijainti: ${clean_(form.location,120)}`,
    `Palvelu: ${clean_(form.service,120)}`, `Kiireellisyys: ${urgency}`,
    `Toivottu yhteydenottotapa: ${clean_(form.method,20)}`, '',
    'Kuvaus:', clean_(form.description,3000), '',
    `Vastaanotettu: ${new Date().toISOString()}`
  ].join('\n');
  MailApp.sendEmail({to:recipient, subject:subject, body:body, replyTo:form.email || undefined, name:'KH-Tech verkkosivusto'});
  return {accepted:true};
}

function login(password) {
  const expected = requiredProperty_(PropertiesService.getScriptProperties(), 'STAFF_PASSWORD');
  const attemptKey = 'login-attempts-' + (Session.getTemporaryActiveUserKey() || 'anonymous');
  const cache = CacheService.getScriptCache();
  if (Number(cache.get(attemptKey) || 0) >= 8) throw new Error('Liikaa kirjautumisyrityksiä. Yritä myöhemmin.');
  if (typeof password !== 'string' || password.length < 14 || !constantTimeEqual_(password, expected)) {
    cache.put(attemptKey, String(Number(cache.get(attemptKey) || 0) + 1), 900);
    throw new Error('Kirjautuminen epäonnistui.');
  }
  cache.remove(attemptKey);
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('session-' + sha256_(token), 'valid', SESSION_TTL_SECONDS);
  return {token:token, expiresIn:SESSION_TTL_SECONDS};
}

function logout(token) { if (typeof token === 'string') CacheService.getScriptCache().remove('session-' + sha256_(token)); return true; }

function emailReport(payload, token) {
  requireSession_(token);
  if (!payload || typeof payload !== 'object' || !/^KHT-\d{8}-[A-F0-9]{6}$/.test(payload.id || '')) throw new Error('Raportin tunnus ei kelpaa.');
  if (typeof payload.pdfBase64 !== 'string' || payload.pdfBase64.length > MAX_REPORT_BYTES * 1.4) throw new Error('PDF-tiedosto on liian suuri.');
  const bytes = Utilities.base64Decode(payload.pdfBase64);
  if (bytes.length > MAX_REPORT_BYTES) throw new Error('PDF-tiedosto on liian suuri.');
  const recipient = requiredProperty_(PropertiesService.getScriptProperties(), 'RECIPIENT_EMAIL');
  const city = clean_(payload.city,80) || 'Kohde';
  const date = clean_(payload.date,20);
  const blob = Utilities.newBlob(bytes, 'application/pdf', `KH-Tech_Tyoraportti_${payload.id}.pdf`);
  MailApp.sendEmail({to:recipient,subject:`[KH-TECH][TYÖRAPORTTI][${payload.id}] ${city} ${date}`,body:`Työraportti ${payload.id} on liitteenä.\n\nTämä viesti lähetettiin KH-Techin raporttityökalusta.`,attachments:[blob],name:'KH-Tech työraportit'});
  return {accepted:true, id:payload.id};
}

function requireSession_(token) {
  if (typeof token !== 'string' || token.length < 50 || CacheService.getScriptCache().get('session-' + sha256_(token)) !== 'valid') throw new Error('Kirjautuminen on vanhentunut. Kirjaudu uudelleen.');
}
function validateContact_(f) {
  if (!f || typeof f !== 'object') throw new Error('Lomakkeen tiedot puuttuvat.');
  if (JSON.stringify(f).length > 8000) throw new Error('Lomakkeen tiedot ovat liian suuret.');
  if (f.honey) throw new Error('Pyyntöä ei voitu käsitellä.');
  ['name','email','phone','location','service','method','description'].forEach(k => {if(typeof f[k] !== 'string' || f[k].length > MAX_TEXT_LENGTH) throw new Error('Tarkista lomakkeen tiedot.');});
  if (!f.name.trim() || !f.description.trim() || (!f.email.trim() && !f.phone.trim())) throw new Error('Nimi, kuvaus ja vähintään yksi yhteystieto vaaditaan.');
  if (f.description.length > 3000 || f.consent !== 'on') throw new Error('Kuvaus on liian pitkä tai tietosuojatietoja ei ole kuitattu.');
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) throw new Error('Sähköpostiosoite ei kelpaa.');
  if (!['normal','soon','urgent'].includes(f.urgency) || !['email','phone'].includes(f.method)) throw new Error('Valitse lomakkeen vaihtoehdot uudelleen.');
}
function requiredProperty_(props, key) { const value=props.getProperty(key); if(!value) throw new Error('Palvelun asetukset puuttuvat.'); return value; }
function clean_(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max); }
function sha256_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value).map(b => ('0'+(b & 255).toString(16)).slice(-2)).join(''); }
function constantTimeEqual_(a,b) { if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0; }
