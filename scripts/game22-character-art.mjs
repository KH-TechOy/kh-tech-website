// Original cartoon illustration inspired by the supplied written appearance / local reference.
// No photograph bytes are read, embedded, copied or published by this module.
const outline='stroke="#132334" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"';
function definitions(logo,icon){return `<defs>
<linearGradient id="jacket" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#667784"/><stop offset=".32" stop-color="#333f4b"/><stop offset="1" stop-color="#101720"/></linearGradient>
<linearGradient id="cap" x1=".1" y1="0" x2=".6" y2="1"><stop stop-color="#64717c"/><stop offset=".35" stop-color="#282f39"/><stop offset="1" stop-color="#090d14"/></linearGradient>
<linearGradient id="trousers" x2=".5" y2="1"><stop stop-color="#344758"/><stop offset="1" stop-color="#152131"/></linearGradient>
<linearGradient id="boots" x2=".3" y2="1"><stop stop-color="#455564"/><stop offset="1" stop-color="#101720"/></linearGradient>
<radialGradient id="face" cx=".35" cy=".2" r=".95"><stop stop-color="#ffe7cf"/><stop offset=".58" stop-color="#f7c79f"/><stop offset="1" stop-color="#d69069"/></radialGradient>
<linearGradient id="steel" x2=".6" y2="1"><stop stop-color="#e5f3fd"/><stop offset=".45" stop-color="#879eae"/><stop offset=".7" stop-color="#cadde8"/><stop offset="1" stop-color="#546b80"/></linearGradient>
<symbol id="official-logo" viewBox="0 0 1340 424"><image width="1340" height="424" href="${logo}"/></symbol>
<symbol id="official-icon" viewBox="0 0 864 975"><image width="864" height="975" href="${icon}"/></symbol>
</defs>`}
function label(x,y,width=43){return `<g stroke="none"><rect x="${x-2}" y="${y-2}" width="${width+4}" height="${width*424/1340+4}" rx="2" fill="#f3f6f8"/><use href="#official-logo" x="${x}" y="${y}" width="${width}" height="${width*424/1340}"/></g>`}
function badge(x,y,width=25){return `<use href="#official-icon" x="${x}" y="${y}" width="${width}" height="${width*975/864}"/>`}
function boots(step=0){const a=step===1?-7:step===2?5:0,b=step===2?-7:step===1?5:0;return `<path d="M86 ${201+a}l-12 16v13q17 12 42 2l-1-29zM144 ${201+b}l-1 31q24 11 44-1v-13l-15-18z" fill="url(#boots)"/><path d="M80 ${227+a}h30m40 ${0+b-a}h29" stroke="#78909f" stroke-width="3"/><path d="M91 ${215+a}h15m48 ${b-a}h15" stroke="#a7b3b8" stroke-width="2"/>`}
function front(step=0,hero=false){return `<g ${outline}>
${hero?'<path d="M45 125L28 67l-13-8-2-22 14 8 14-7-3-15 17 11 5 21-8 12 18 51z" fill="url(#steel)"/>':''}
${boots(step)}
<path d="M82 174l3 35 29 4 14-32 14 32 30-4 8-37z" fill="url(#trousers)"/>
<path d="M88 189l22 2-2 12-19-1m57-10 20-2-1 13-19 2" fill="#293a48" stroke="#607184" stroke-width="2.5"/>
<path d="M78 134q-28 5-34 37l14 15 30-31" fill="url(#jacket)"/>
${hero?'<path d="M169 137q20-5 25-25l20 8q6 36-30 52z" fill="url(#jacket)"/><path d="M190 117l-4-20q-2-9 7-10l5 16 3-31q0-10 8-9 10 1 9 11l-1 19 10-3q14 1 12 16l-4 15q-18 15-45-4z" fill="url(#face)"/><path d="M216 98l13 3m-13 7 11 2" fill="none" stroke="#c48863" stroke-width="2.5"/>':'<path d="M171 136q27 1 36 37l-16 14-27-32" fill="url(#jacket)"/><path d="M194 172q18-3 20 14v14q-12 11-24-1l-3-18z" fill="#3d4248"/>'}
<path d="M46 171q-18 2-12 22l10 12q16 4 24-12l-2-16z" fill="#434b51"/>
<path d="M80 131q48-13 92 2l11 54q-55 19-108 0z" fill="url(#jacket)"/>
<path d="M108 125l21 25 20-25-1 24-19 8-20-8z" fill="#111b25"/>
<path d="M128 151v34" fill="none" stroke="#91a1af" stroke-width="3"/>
<path d="M87 148l-6 30m83-30 10 30" fill="none" stroke="#70818d" stroke-width="2.5"/>
<path d="M77 184q54 12 104-1v13q-54 15-103 0z" fill="#23262b"/>
<path d="M117 185h24v16h-24z" fill="#b9c5ce" stroke-width="2.5"/><path d="M151 189h24l4 23-24 3z" fill="#b17d3c"/><path d="M158 192v13m9-14 1 12" stroke="#ffcf7b" stroke-width="3"/>
<path d="M107 120v18q21 13 41-1v-19" fill="url(#face)"/>
<path d="M76 78q-19-7-19 12-1 17 19 21m102-32q18-5 18 12 0 18-18 21" fill="url(#face)"/>
<path d="M76 61q49-26 103 1l2 37q-6 37-50 51-44-9-53-40z" fill="url(#face)"/>
<path d="M77 67l3 33 8-13 7-23m82 4-3 31-8-14-5-20" fill="#62472f"/>
<path d="M89 90q12-9 25-2m29-1q13-7 23 2" fill="none" stroke="#65482f" stroke-width="5"/>
<path d="M91 98q13-11 25 0l-2 12q-11 6-22-1zm50-1q14-8 25 2l-1 12q-13 5-23-2z" fill="#fffdf6" stroke="#5e4d42" stroke-width="2.1"/>
<ellipse cx="105" cy="103" rx="6" ry="7" fill="#69806b" stroke="none"/><ellipse cx="152" cy="103" rx="6" ry="7" fill="#69806b" stroke="none"/><ellipse cx="106" cy="103" rx="3" ry="5" fill="#243243" stroke="none"/><ellipse cx="151" cy="103" rx="3" ry="5" fill="#243243" stroke="none"/><circle cx="103" cy="100" r="2" fill="white" stroke="none"/><circle cx="149" cy="100" r="2" fill="white" stroke="none"/>
<path d="M124 98q-7 13-3 16l14 1" fill="none" stroke="#cb936d" stroke-width="2.5"/>
<path d="M108 126q21 15 39-2-6 21-21 17-12-2-18-15" fill="#fff7ec" stroke="#bc7c63" stroke-width="2.5"/>
<path d="M119 143q9 3 16-1" fill="none" stroke="#d3a080" stroke-width="2"/>
<path d="M63 70q4-43 63-46 56 0 62 47l-14 14q-49-18-98 1z" fill="url(#cap)"/>
<path d="M79 51q13-18 38-20m38 2 13 33" fill="none" stroke="#8c9aa4" stroke-width="3.5" opacity=".7"/>
<path d="M62 75q66-25 133-2l-9 15q-66-13-110 2z" fill="#121a24"/><path d="M80 77q54-13 101 0" fill="none" stroke="#6a7d8c" stroke-width="3"/>
</g>${badge(120,35,23)}${label(139,151,31)}`}
function back(step=0){return `<g ${outline}>${boots(step)}
<path d="M82 173l4 38 28 2 15-32 14 32 29-3 6-38z" fill="url(#trousers)"/>
<path d="M79 133q-27 4-34 39l14 14 29-30m82-23q28 3 36 39l-15 16-28-34" fill="url(#jacket)"/>
<path d="M47 172q-18 2-11 25 14 14 27-1l3-19zm148 1q18-1 19 16 2 18-15 17l-12-21z" fill="#424b52"/>
<path d="M80 131q49-14 91 1l12 55q-54 20-108-1z" fill="url(#jacket)"/>
<path d="M96 132q31 26 66 0l-7 19-44 2z" fill="#202c37"/><path d="M90 143l-8 32m84-33 9 33" stroke="#71818e" stroke-width="2.5" fill="none"/>
<path d="M77 184q54 14 104 0v13q-51 14-103-1z" fill="#23292f"/><path d="M151 188h23l5 24-24 2z" fill="#b7894b"/>
<path d="M110 113v22q19 10 37 0v-24" fill="url(#face)"/>
<path d="M80 68q50-23 95 0l5 42q-18 25-50 28-35-4-49-27z" fill="#63482f"/>
<path d="M63 73q5-44 64-48 61 2 64 51l-8 28q-56 23-107-1z" fill="url(#cap)"/>
<path d="M82 53q14-18 34-20m16 0v57m32-42 13 35" fill="none" stroke="#8796a2" stroke-width="3" opacity=".7"/>
<path d="M111 95h35v15h-35z" fill="#101a25"/><path d="M123 99h12v6h-12z" fill="#9eb0bc" stroke="none"/>
</g>${label(99,155,59)}`}
function side(step=0,flip=false){const body=`<g ${outline}>${boots(step)}
<path d="M92 175l3 34 29 2 15-33 9 31 26-2-5-37z" fill="url(#trousers)"/>
<path d="M93 133q37-16 73 1l16 54q-43 18-89-2z" fill="url(#jacket)"/>
<path d="M106 134q-24 3-28 36l17 14 25-28" fill="url(#jacket)"/><path d="M83 171q-18 2-10 23l13 10q15-1 19-17l-7-12z" fill="#444d54"/>
<path d="M98 184l77-1v14q-42 14-78-1z" fill="#20262e"/><path d="M143 185h21v15h-21z" fill="#bac7ce"/><path d="M157 192h18l6 20-21 4z" fill="#bd8c47"/>
<path d="M121 115v23q22 13 39-1v-27" fill="url(#face)"/>
<path d="M101 64q47-21 77 10l1 20 18 14-17 10q-5 28-38 32-35-9-42-41z" fill="url(#face)"/>
<path d="M99 70q-17 1-15 19l17 18 9-21 4-21" fill="#664a31"/><path d="M105 85q-14-7-18 5l4 16 15 0" fill="url(#face)"/>
<path d="M151 89q13-8 24 0" fill="none" stroke="#65452f" stroke-width="5"/>
<path d="M151 98q10-10 22-1l-1 14-19 1z" fill="#fffdf7" stroke="#725c47" stroke-width="2"/><ellipse cx="165" cy="104" rx="5" ry="7" fill="#657c65" stroke="none"/><ellipse cx="167" cy="104" rx="2.6" ry="4.5" fill="#243243" stroke="none"/>
<path d="M157 128q15 10 24-4" fill="none" stroke="#bd7b61" stroke-width="2.8"/>
<path d="M85 70q4-44 51-46 48 1 51 47l-16 14-77 1z" fill="url(#cap)"/><path d="M103 49q11-16 29-18" stroke="#8d9aa6" stroke-width="3.5" fill="none"/>
<path d="M129 73q42-16 73-1l-4 14-54 2z" fill="#111a25"/><path d="M147 75l40-2" stroke="#647785" stroke-width="3" fill="none"/>
</g>`;return `<g transform="${flip?'translate(256 0) scale(-1 1)':''}">${body}</g>${badge(flip?88:145,37,22)}${label(flip?82:139,151,32)}`}
export function characterSheet(logo,icon){let content='';for(let row=0;row<4;row++)for(let frame=0;frame<3;frame++)content+=`<g transform="translate(${frame*256} ${row*256})">${row===0?front(frame):row===1?side(frame,true):row===2?side(frame):back(frame)}</g>`;return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">${definitions(logo,icon)}${content}</svg>`}
export function mascotArt(logo,icon){return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${definitions(logo,icon)}${front(0,true)}</svg>`}
