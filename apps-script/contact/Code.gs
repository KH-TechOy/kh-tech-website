/** CONTACT 3.0: deploy this isolated project, never the historical report/auth draft. */
const CONTACT_MAX_BYTES_ = 20000;
const CONTACT_TTL_ = 48 * 60 * 60 * 1000;
const CONTACT_SERVICES_ = ['', 'LVI-huolto', 'Putkimuutostyöt', 'Verkostojen tasapainotus', 'Käyttövesi- ja viemärisaneeraukset', 'Muu LVI-työ'];

function doGet() {
  return contactOutput_({error:'method'});
}

function doPost(event) {
  let secret, payload;
  try {
    const props = PropertiesService.getScriptProperties();
    secret = props.getProperty('RELAY_SECRET');
    if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error('config');
    if (!event || !event.postData || event.postData.type.split(';')[0] !== 'application/json' || event.contentLength > CONTACT_MAX_BYTES_) throw new Error('request');
    const raw = event.postData.contents;
    if (Utilities.newBlob(raw).getBytes().length > CONTACT_MAX_BYTES_) throw new Error('size');
    const envelope = JSON.parse(raw);
    if (typeof envelope.message !== 'string' || !contactEqual_(envelope.signature, contactHmac_(secret, 'request\n' + envelope.message))) throw new Error('auth');
    payload = JSON.parse(envelope.message);
    if (payload.v !== 1 || !Number.isFinite(payload.timestamp) || Math.abs(Date.now() - payload.timestamp) > 300000 || !/^[a-f0-9]{64}$/.test(payload.keyHash)) throw new Error('auth');
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return contactSigned_(secret, {keyHash:payload.keyHash, reference:payload.reference, state:'unknown'});
    try { return contactSigned_(secret, contactProcess_(props, payload)); }
    finally { lock.releaseLock(); }
  } catch (_) {
    // Never return exceptions, email addresses, input, tokens or configuration.
    return contactOutput_({error:'rejected'});
  }
}

function contactProcess_(props, payload) {
  const key = 'contact:' + payload.keyHash;
  const stored = props.getProperty(key);
  const record = stored ? JSON.parse(stored) : null;
  if (payload.operation === 'status') {
    if (record && record.reference !== payload.reference) throw new Error('conflict');
    return {keyHash:payload.keyHash, reference:payload.reference, state:record ? (record.state === 'pending' ? 'unknown' : record.state) : 'not_found'};
  }
  if (payload.operation !== 'send' || !/^KHT-\d{8}-[A-F0-9]{12}$/.test(payload.reference) || !/^[a-f0-9]{64}$/.test(payload.hash)) throw new Error('request');
  if (!Number.isFinite(payload.expires) || payload.expires <= Date.now() || payload.expires > Date.now() + CONTACT_TTL_ + 60000 || !Number.isFinite(Date.parse(payload.submittedAt))) throw new Error('expired');
  const data = contactValidate_(payload.data);
  const digest = contactHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(data), Utilities.Charset.UTF_8));
  if (digest !== payload.hash) throw new Error('digest');
  if (record) {
    if (record.hash !== digest || record.reference !== payload.reference) throw new Error('conflict');
    return {keyHash:payload.keyHash, reference:record.reference, state:record.state === 'pending' ? 'unknown' : record.state};
  }
  contactCleanupLocked_(props);
  const recipient = props.getProperty('RECIPIENT_EMAIL') || '';
  // Exactly one server-controlled mailbox; no cc, bcc, from or recipient supplied by a client.
  if (!contactEmail_(recipient)) throw new Error('config');
  const result = {keyHash:payload.keyHash, reference:payload.reference, state:'not_sent'};
  if (MailApp.getRemainingDailyQuota() < 1) return result;
  // A second collision check protects future report linking even in the unlikely random collision.
  const referenceKey = 'reference:' + payload.reference;
  if (props.getProperty(referenceKey)) throw new Error('collision');
  const next = {hash:digest, reference:payload.reference, state:'pending', expires:payload.expires};
  props.setProperties({[key]:JSON.stringify(next), [referenceKey]:String(payload.expires)});
  try {
    const email = contactEmailContent_(data, payload.reference, payload.submittedAt);
    const options = {to:recipient, subject:email.subject, body:email.body, name:'KH-Tech Oy – yhteydenotot'};
    if (data.email) options.replyTo = data.email;
    MailApp.sendEmail(options);
    next.state = 'sent';
  } catch (_) {
    // MailApp has no transactional idempotency or inbox receipt. Never send again after ambiguity.
    next.state = 'unknown';
  }
  props.setProperty(key, JSON.stringify(next));
  result.state = next.state;
  return result;
}

function contactValidate_(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('validation');
  const keys = ['name','email','phone','location','service','urgency','method','description','honey'];
  if (Object.keys(raw).some(k => keys.indexOf(k) === -1)) throw new Error('validation');
  const data = {};
  keys.forEach(k => {
    const max = k === 'description' ? 3000 : k === 'email' ? 160 : k === 'phone' ? 40 : k === 'urgency' || k === 'method' ? 10 : 120;
    if (typeof raw[k] !== 'string' || raw[k].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw[k]) || (k !== 'description' && /[\r\n\t]/.test(raw[k]))) throw new Error('validation');
    data[k] = raw[k].trim().replace(/\r\n?/g,'\n');
  });
  if (!data.name || !data.description || data.honey || CONTACT_SERVICES_.indexOf(data.service) < 0) throw new Error('validation');
  if (['normal','soon','urgent'].indexOf(data.urgency) < 0 || ['phone','email','both'].indexOf(data.method) < 0) throw new Error('validation');
  if (((data.method === 'phone' || data.method === 'both') && !data.phone) || ((data.method === 'email' || data.method === 'both') && !data.email)) throw new Error('validation');
  if (data.email && !contactEmail_(data.email)) throw new Error('validation');
  if (data.phone && (!/^\+?[\d ()-]{5,40}$/.test(data.phone) || data.phone.replace(/\D/g,'').length < 5)) throw new Error('validation');
  return data;
}

function contactEmail_(email) {
  return typeof email === 'string' && email.length <= 160 && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,63}$/.test(email);
}

function contactEmailContent_(data, reference, submittedAt) {
  const urgency = {normal:'Sovittavissa',soon:'Lähiaikoina',urgent:'KIIREELLINEN'}[data.urgency];
  return {
    subject:'[KH-Tech][TARJOUSPYYNTÖ][' + reference + ']' + (data.urgency === 'urgent' ? '[KIIREELLINEN]' : ''),
    body:[
      'Uusi yhteydenotto KH-Tech Oy:n verkkosivustolta.', '',
      'Pyyntötunnus: ' + reference,
      'Vastaanotettu: ' + Utilities.formatDate(new Date(submittedAt), 'Europe/Helsinki', 'dd.MM.yyyy HH:mm:ss z'),
      'Nimi: ' + data.name, 'Puhelin: ' + (data.phone || 'Ei annettu'), 'Sähköposti: ' + (data.email || 'Ei annettu'),
      'Työn sijainti: ' + (data.location || 'Ei annettu'), 'Palvelu: ' + (data.service || 'Ei valittu'),
      'Ajankohta: ' + urgency, 'Toivottu yhteydenottotapa: ' + ({phone:'Soitto puhelimeen',email:'Vastaus sähköpostilla',both:'Puhelin ja sähköposti'})[data.method],
      '', 'Työn kuvaus (asiakkaan kirjoittama):', '---', data.description, '---', '',
      'Kiireellisyysmerkintä ei takaa päivystystä tai välitöntä vastausta.',
      'Säilytä pyyntötunnus mahdollista työraporttia varten. Tämä viesti ei sisällä liitteitä.'
    ].join('\n')
  };
}

/** Install an hourly trigger for this function. It sends no mail. */
function cleanupContactLedger() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try { contactCleanupLocked_(PropertiesService.getScriptProperties()); }
  finally { lock.releaseLock(); }
}
function contactCleanupLocked_(props) {
  const all = props.getProperties(), now = Date.now();
  Object.keys(all).forEach(key => {
    if (key.indexOf('contact:') === 0 && JSON.parse(all[key]).expires <= now) props.deleteProperty(key);
    else if (key.indexOf('reference:') === 0 && Number(all[key]) <= now) props.deleteProperty(key);
  });
}
/** Run once in the editor to approve send_mail scope without sending a test email. */
function authorizeContactMail() { MailApp.getRemainingDailyQuota(); }
function contactHex_(bytes) { return bytes.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }
function contactHmac_(secret, message) { return contactHex_(Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8)); }
function contactEqual_(a,b) { if(typeof a !== 'string' || a.length !== b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0; }
function contactSigned_(secret, value) { const message=JSON.stringify(value);return contactOutput_({message:message,signature:contactHmac_(secret,'response\n'+message)}); }
function contactOutput_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
