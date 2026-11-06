// Original project artwork. No concept pixels or third-party game assets are used.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const out = new URL('../public/game2/', import.meta.url);
await mkdir(out, { recursive: true });
const defs = `<defs>
 <linearGradient id="blue" x2=".3" y2="1"><stop stop-color="#63caff"/><stop offset=".45" stop-color="#2389eb"/><stop offset="1" stop-color="#1550a2"/></linearGradient>
 <linearGradient id="navy" x2=".7" y2="1"><stop stop-color="#416d9b"/><stop offset="1" stop-color="#122c50"/></linearGradient>
 <linearGradient id="orange" x2=".5" y2="1"><stop stop-color="#ffd37b"/><stop offset=".45" stop-color="#ff9c36"/><stop offset="1" stop-color="#c85d23"/></linearGradient>
 <linearGradient id="red" x2=".2" y2="1"><stop stop-color="#ffb05c"/><stop offset=".3" stop-color="#f96539"/><stop offset="1" stop-color="#b32e30"/></linearGradient>
 <linearGradient id="skin" x2=".3" y2="1"><stop stop-color="#ffe3ae"/><stop offset=".55" stop-color="#ffc17c"/><stop offset="1" stop-color="#df8846"/></linearGradient>
 <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f0eeff"/><stop offset=".23" stop-color="#b3b9e3"/><stop offset=".52" stop-color="#7d80ab"/><stop offset=".7" stop-color="#ced4f6"/><stop offset="1" stop-color="#575f89"/></linearGradient>
 <linearGradient id="wood" x2=".4" y2="1"><stop stop-color="#ffcc78"/><stop offset=".5" stop-color="#e89443"/><stop offset="1" stop-color="#b35e2c"/></linearGradient>
 <linearGradient id="green" x2=".5" y2="1"><stop stop-color="#b2e94b"/><stop offset=".45" stop-color="#5db538"/><stop offset="1" stop-color="#237357"/></linearGradient>
 <radialGradient id="water"><stop stop-color="#8cf6ff"/><stop offset=".6" stop-color="#19c6f8"/><stop offset="1" stop-color="#148bd8"/></radialGradient>
 <radialGradient id="light"><stop stop-color="#fff09c" stop-opacity=".75"/><stop offset=".35" stop-color="#ffb354" stop-opacity=".25"/><stop offset="1" stop-color="#ffb354" stop-opacity="0"/></radialGradient>
 </defs>`;
const svg=(content,w=256,h=256)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${content}</svg>`;
const save=(name,content,w=256,h=256)=>writeFile(new URL(name+'.svg',out),svg(content,w,h),'utf8');
const stroke='stroke="#172c4d" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
function front(step=0){const feet=step===1?[-6,5]:step===2?[5,-6]:[0,0];return `<g ${stroke}>
 <path d="M85 ${204+feet[0]}q-15 3-17 15l1 13q20 10 42 0l-1-29z" fill="url(#navy)"/><path d="M145 ${204+feet[1]}q-3 8-1 28 22 10 43-2l-2-13q-7-14-26-14z" fill="url(#navy)"/>
 <path d="M77 174q0 28 8 39l25 3 16-34 17 34 26-4 9-41z" fill="url(#orange)"/>
 <path d="M73 137q-26 4-30 37l15 10 28-27m88-20q25 4 34 38l-15 11-31-30" fill="url(#blue)"/>
 <path d="M47 170q-15 2-13 19l9 14q13 8 23-4l3-21zM199 172q13 0 17 13l-2 16q-12 11-23 0l-4-20z" fill="#b77437"/>
 <path d="M82 133q44-14 88 1l13 53q-54 20-109-1z" fill="url(#orange)"/>
 <path d="M92 132l8 37m55-38-6 39" fill="none" stroke="#ffe7a0" stroke-width="10"/><path d="M102 158h45v30h-45z" fill="#ed8328"/>
 <path d="M79 183q49 13 98-1v13q-50 15-98 1z" fill="#85502e"/><path d="M117 184h25v17h-25z" fill="#ffe199"/>
 <path d="M91 168l11 1m46 0 12-1" stroke="#fff1bd" stroke-width="4"/><path d="M152 203l10-12 10 10" fill="none" stroke="#a94d23" stroke-width="3"/>
 <path d="M106 122v19q23 14 43-1v-20" fill="url(#skin)"/>
 <path d="M78 78q-20-6-20 16 1 17 21 17m99-33q21-7 21 14-1 18-20 19" fill="url(#skin)"/>
 <path d="M77 64q44-31 99 0l5 37q-2 35-52 46-47-9-52-42z" fill="url(#skin)"/>
 <path d="M78 72l2 29 9-12 2-24m86 8-3 28-9-13-1-26" fill="#70432d"/>
 <path d="M89 89q12-12 25-2m29-1q13-10 24 1" fill="none" stroke="#5b352b" stroke-width="7"/>
 <path d="M92 96q10-10 21 1v13q-11 6-20-1zm50 0q12-9 22 2l-1 12q-10 5-20-1z" fill="white" stroke-width="2"/>
 <ellipse cx="105" cy="102" rx="5" ry="8" fill="#16334b" stroke="none"/><ellipse cx="150" cy="102" rx="5" ry="8" fill="#16334b" stroke="none"/>
 <path d="M123 97q-10 15-3 19l18-1" fill="url(#skin)" stroke="#cb783f" stroke-width="3"/>
 <path d="M99 120q14-17 29-4 16-13 30 3-15 11-30 3-16 9-29-2" fill="#5e392c" stroke-width="2"/>
 <path d="M108 128q20 17 40-1-20 6-40 1" fill="white" stroke-width="2"/>
 <path d="M67 69q2-42 58-47 56-1 63 46l-14 19q-47-24-99 0z" fill="url(#blue)"/>
 <path d="M78 53q7-20 37-24" fill="none" stroke="#90e4ff" stroke-width="6"/>
 <path d="M66 74q65-23 127-1l-8 13q-62-10-108 3z" fill="#1457aa"/>
 <path d="M119 36h24l4 25-28 2z" fill="#d8f9ff" stroke="#2c85d9" stroke-width="2"/>
 <path d="M132 41q-10 10-7 15 8 6 13-1 0-6-6-14" fill="#278de7" stroke="none"/>
 </g>`}
function back(step=0){const shift=step===1?-5:step===2?5:0;return `<g ${stroke}>
 <path d="M82 ${206+shift}l-8 23q16 14 39 3l-2-27zm61 ${206-shift}v26q24 11 40-3l-9-24z" fill="url(#navy)"/>
 <path d="M77 178l7 35 29 3 14-33 16 33 30-4 5-34z" fill="url(#orange)"/>
 <path d="M79 135q-29 1-35 41l15 15 27-35m89-21q30 6 34 42l-15 12-27-34" fill="url(#blue)"/>
 <path d="M48 174q-19 4-11 27 15 13 28-3l2-20zm146 2q21-3 21 17-2 20-20 14l-9-22z" fill="#b77437"/>
 <path d="M79 135q47-21 96 0l7 53q-51 24-108-1z" fill="url(#orange)"/>
 <path d="M94 133l16 48m49-49-16 50" stroke="#ffdc87" stroke-width="13"/>
 <path d="M109 158l37 0v28h-37z" fill="#d57129"/>
 <path d="M75 187q55 16 107 0v12q-58 18-106-1z" fill="#865231"/>
 <path d="M111 116v23q21 11 39-2v-24" fill="url(#skin)"/>
 <path d="M81 66q50-32 95 1l6 41q-16 29-55 31-38-4-49-32z" fill="#70452e"/>
 <path d="M64 74q2-46 63-51 61 1 65 54l-9 27q-54 27-108-1z" fill="url(#blue)"/>
 <path d="M82 58q10-21 37-27m13 2v62" stroke="#8bddff" stroke-width="5" fill="none"/>
 <path d="M112 93h34v17h-34z" fill="#174b8c"/><path d="M122 98h14v6h-14z" fill="#d7f4ff" stroke="none"/>
 </g>`}
function side(step=0,flip=false){return `<g transform="${flip?'translate(256 0) scale(-1 1)':''}"><g ${stroke}>
 <path d="M93 ${205+(step===1?-5:0)}l-8 21q26 15 54 2l-9-24zm49 ${201+(step===2?-5:0)}l-5 26q26 13 51-4-2-18-20-22z" fill="url(#navy)"/>
 <path d="M95 169l1 40 31 2 13-34 9 32 26-2-4-42z" fill="url(#orange)"/>
 <path d="M91 134q36-20 73 0l18 54q-42 18-88-2z" fill="url(#orange)"/>
 <path d="M105 133l9 35 32-2-2-35" fill="#2e79b6"/><path d="M103 139q-21 5-25 33l18 12 24-29" fill="url(#blue)"/>
 <path d="M82 169q-15 4-8 25l14 9q15 0 17-17l-8-13z" fill="#b77437"/>
 <path d="M97 184l78 0v13q-39 17-78-1z" fill="#82502f"/><path d="M141 183l24-1v17h-23z" fill="#ffe396"/>
 <path d="M121 114v25q23 13 40-2v-30" fill="url(#skin)"/>
 <path d="M101 66q49-21 76 9l1 20 20 15-19 12q-7 23-39 27-37-9-42-42z" fill="url(#skin)"/>
 <path d="M98 69q-21 1-17 24 4 15 23 15l8-23z" fill="#7b4a31"/><path d="M104 82q-14-7-18 5l4 18 16 0" fill="url(#skin)"/>
 <path d="M151 87q15-10 24 1" fill="none" stroke="#61392c" stroke-width="7"/>
 <path d="M151 98q9-12 20-2v17h-18z" fill="white" stroke-width="2"/><ellipse cx="165" cy="103" rx="5" ry="7" fill="#15304b" stroke="none"/>
 <path d="M155 119q16-11 29-1l-5 8-25-1z" fill="#583329" stroke-width="2"/><path d="M153 132q18 10 28-5" stroke="#69392b" stroke-width="3" fill="none"/>
 <path d="M86 68q3-41 50-44 49 0 50 47l-14 15-78-1z" fill="url(#blue)"/>
 <path d="M102 49q12-18 30-18" fill="none" stroke="#8ce0ff" stroke-width="6"/>
 <path d="M126 71q48-17 76 0l-4 15-55 1z" fill="#1763bb"/>
 </g></g>`}
let sheet='';for(let row=0;row<4;row++)for(let col=0;col<3;col++)sheet+=`<g transform="translate(${col*256} ${row*256})">${row===0?front(col):row===1?side(col,true):row===2?side(col):back(col)}</g>`;
await save('plumber-sheet',sheet,768,1024);
await save('mascot',front(0));
await save('crate',`<g ${stroke}><path d="M38 67l152-24 34 26-1 141-153 23-32-28z" fill="#94502d"/><path d="M38 67l151-24 35 26-150 26z" fill="#ffd18a"/><path d="M75 94l149-25-1 141-149 23z" fill="url(#wood)"/><path d="M39 68l36 26-1 139-36-29z" fill="#b96b36"/><path d="M90 107l118-20-1 108-118 18z" fill="#c87835"/><path d="M105 104v103m29-109v104m31-109v104m29-109v104" stroke="#ad5a2a" stroke-width="3"/><path d="M91 108l101 92 16-6L108 101zm0 89 14 14L208 98l-10-11z" fill="#ffbd68" stroke="#c27a39" stroke-width="3"/><path d="M80 97l136-23M82 225l132-21" stroke="#ffda91" stroke-width="5"/><g fill="#734f3d" stroke="none"><circle cx="88" cy="105" r="4"/><circle cx="209" cy="85" r="4"/><circle cx="87" cy="217" r="4"/><circle cx="211" cy="197" r="4"/></g></g>`);
await save('valve',`<g ${stroke}><path d="M11 116h234v67H11z" fill="url(#metal)"/><path d="M23 109h23v81H23zm187 0h24v81h-24z" fill="url(#metal)"/><path d="M111 94h34v61h-34z" fill="#7e87ac"/><path d="M111 107l-5-34 48-2-10 38" fill="url(#metal)"/><circle cx="128" cy="91" r="62" fill="url(#red)"/><circle cx="128" cy="91" r="43" fill="#743d48"/><path d="M128 48v86M85 91h86m-73-30 61 61m0-61-61 61" stroke="#ff8f49" stroke-width="12"/><circle cx="128" cy="91" r="17" fill="#ffd17c"/><path d="M93 50q36-25 67 1" fill="none" stroke="#ffd18d" stroke-width="5"/><path d="M53 131h28m89 0h30" stroke="#f3f2ff" stroke-width="7"/></g>`);
await save('toolbox',`<g ${stroke}><path d="M32 113l154-17 38 26-3 88-154 20-35-27z" fill="url(#red)"/><path d="M30 98l155-16 40 28-158 20-37-19z" fill="#ff9650"/><path d="M67 129l157-19-1 35-156 20z" fill="#ffb066"/><path d="M96 92V63q0-17 17-19l40-3q19-1 21 16v29l-20 3V64l-36 4v25z" fill="url(#navy)"/><path d="M103 52l51-5" stroke="#8dacc4" stroke-width="5"/><path d="M121 149l23-3v32l-22 3z" fill="#ffdc84"/><path d="M77 184l32-3m45-7 44-5" fill="none" stroke="#ff8d61" stroke-width="5"/><path d="M38 144l17 11v41l-17-11z" fill="#c84c32"/></g>`);
await save('gasket',`<g ${stroke}><ellipse cx="128" cy="150" rx="88" ry="61" fill="#14283d"/><path d="M40 124v26q5 58 88 62 83-7 88-62v-26z" fill="#243d58"/><ellipse cx="128" cy="124" rx="88" ry="61" fill="url(#metal)"/><ellipse cx="128" cy="123" rx="51" ry="32" fill="#132c47"/><path d="M82 131q12 31 47 31 39-1 51-30" fill="none" stroke="#506682" stroke-width="7"/><path d="M60 106q29-38 78-30m20 5q24 7 34 24" fill="none" stroke="#e3f4ff" stroke-width="8"/><path d="M59 168q20 27 48 29" stroke="#415b78" stroke-width="6" fill="none"/></g>`);
await save('plant',`<g ${stroke}><path d="M75 167l14 63q40 19 80-1l15-63z" fill="url(#orange)"/><ellipse cx="129" cy="165" rx="60" ry="24" fill="#d2753d"/><ellipse cx="129" cy="163" rx="46" ry="15" fill="#684d3d"/><path d="M129 169q-4-69-40-94m41 84q24-78 62-98m-65 95q-11-65 10-114" fill="none" stroke="#5e923d" stroke-width="9"/><path d="M122 123Q58 137 41 77q59-20 81 46zM124 112Q78 70 97 22q60 19 27 90zM139 119q-6-71 52-88 29 62-52 88zM145 139q39-65 82-31-10 55-82 31zM114 152q-64 16-80-35 51-30 80 35z" fill="url(#green)"/><path d="M49 84l60 32m-8-82 20 67m64-57-35 58m-40 40-62-18m106 9 57-20" fill="none" stroke="#d1ef78" stroke-width="4"/></g>`);
await save('boiler',`<g ${stroke}><path d="M75 56h111v151q-55 30-111 0z" fill="url(#metal)"/><ellipse cx="130" cy="55" rx="55" ry="23" fill="#e2e8ff"/><path d="M76 81q54 20 109 0m-109 97q53 21 109-1" fill="none" stroke="#6a78a4" stroke-width="10"/><path d="M92 66v111" stroke="#f9f6ff" stroke-width="9"/><path d="M97 211v18m63-19v19" fill="none" stroke="#344868" stroke-width="16"/><circle cx="134" cy="120" r="22" fill="#f7efce"/><path d="M134 121l12-12" stroke="#ed7655" stroke-width="4"/><path d="M101 33V16h28m30 20V14h27" fill="none" stroke="#4da5bc" stroke-width="12"/><path d="M185 165h29v55h-26" fill="none" stroke="#6c8ba7" stroke-width="13"/></g>`);
await save('counter',`<g ${stroke}><path d="M27 86l164-17 38 28-5 113-161 23-36-28z" fill="#bd743d"/><path d="M27 79l167-18 38 29-169 25-37-23z" fill="#ffe2a4"/><path d="M64 115l164-24-2 28-162 24z" fill="#e2ba81"/><path d="M75 147l64-8v70l-63 8zm73-10 63-9-1 71-61 9z" fill="url(#wood)"/><path d="M128 164v18m31-23v19" stroke="#543e3b" stroke-width="6"/><path d="M71 82l70-8 27 19-70 10z" fill="#566e90"/><path d="M83 83l55-6 17 13-55 8z" fill="#9dd2e3"/><path d="M125 75V47q-1-24 23-25 24-1 25 19v15" fill="none" stroke="#1d3856" stroke-width="14"/><path d="M125 75V47q-1-24 23-25 24-1 25 19v15" fill="none" stroke="#a6d6eb" stroke-width="9"/><path d="M179 70l14 9 15-4-14-9z" fill="#32b2c3"/></g>`);
await save('shelf',`<g ${stroke}><path d="M40 43l164-16v25L40 69zm0 91 164-16v23L40 159zm0 91 164-16v22L40 249z" fill="url(#navy)"/><path d="M43 35l-1 206m159-220v214" stroke="#26435e" stroke-width="14"/><path d="M60 70l55-5v57l-55 6zm65-7 57-6v57l-57 7zm-60 99 63-6v53l-63 6zm72-8 44-6v53l-44 7z" fill="url(#orange)"/><path d="M80 69v52m65-60v53m-58 45v50m70-59v53" stroke="#ffe0a0" stroke-width="8"/><path d="M64 82l42-4m24-2 43-5" stroke="#dc883b" stroke-width="3"/></g>`);
await save('pipe',`<g ${stroke}><path d="M0 94h256v72H0z" fill="url(#metal)"/><path d="M27 88h22v83H27zm179 0h23v83h-23z" fill="url(#metal)"/><path d="M57 106h140" stroke="#e1ebff" stroke-width="9"/><path d="M57 156h140" stroke="#5e628d" stroke-width="6"/></g>`);
await save('leak',`<g ${stroke}><path d="M0 85h99l10 12-7 21 10 17-11 26H0zm256 0H155l-11 14 10 16-8 19 10 27h100z" fill="url(#metal)"/><path d="M22 79h22v88H22zm187 0h23v88h-23z" fill="url(#metal)"/><path d="M51 98h37m80 0h32" stroke="#e7eaff" stroke-width="8"/><path d="M116 114q25-14 28 0 9 26-6 77-3 19-22 14-18-8-10-31z" fill="url(#water)" stroke="#087ec0" stroke-width="3"/><path d="M124 126l-3 42" stroke="#c6fbff" stroke-width="7"/><path d="M98 202l-19 10m75-12 17 9m-35-1 4 13" stroke="#6bf0ff" stroke-width="8"/></g>`);
await save('puddle',`<path d="M28 121q-27-22 8-43 26-13 52-4-6-40 39-35 28 1 29 27 50-8 57 19 43 8 24 37-10 12-36 13 20 29-9 42-35 15-58-3-19 28-46 13-16-10-15-25-51 17-62-9-9-20 17-32" fill="url(#water)" stroke="#49e5ff" stroke-width="5"/><path d="M35 101q13-18 40-13m27-35 25-3m44 31q20-3 30 10m-86 73q18 1 27-7" fill="none" stroke="#a4f9ff" stroke-width="6" stroke-linecap="round"/><ellipse cx="61" cy="193" rx="18" ry="9" fill="#28c7f5" stroke="#78f0ff" stroke-width="3"/><ellipse cx="212" cy="159" rx="12" ry="7" fill="#28c7f5"/>`);
await save('gate',`<g ${stroke}><path d="M29 49h198v171H29z" fill="url(#navy)"/><path d="M47 65h160v140H47z" fill="#223f5e"/><path d="M56 77h142v113H56z" fill="url(#metal)"/><path d="M59 101h135m-135 28h135m-135 28h135m-135 27h135" stroke="#616a91" stroke-width="8"/><path d="M38 48h180v21H38zM38 198h180v19H38z" fill="#ffcb61"/><path d="M55 48l20 21m17-21 20 21m17-21 20 21m17-21 20 21m-131 129 20 19m17-19 20 19m17-19 20 19m17-19 20 19" stroke="#443e42" stroke-width="11"/><path d="M111 145h30v25h-30z" fill="#ffcb61"/></g>`);
await save('plate',`<g ${stroke}><path d="M33 118l148-18 43 30-147 22z" fill="#344d6e"/><path d="M33 118v23l44 33 146-23v-21l-146 22z" fill="#192e4a"/><path d="M61 119l110-14 26 21-112 17z" fill="#ffca5d"/><path d="M89 123l28-4 19 12-29 4z" fill="#fff3ac" stroke="#b4823e" stroke-width="3"/><path d="M149 115l17 12m-86 9 12 8" stroke="#dd9745" stroke-width="4"/></g>`);
await save('wall-light',`<ellipse cx="128" cy="128" rx="126" ry="126" fill="url(#light)"/><g ${stroke}><path d="M55 105h146v45H55z" fill="#9d6c3f"/><rect x="66" y="107" width="124" height="32" rx="14" fill="#ffe998"/><path d="M80 113h91" stroke="#fffac8" stroke-width="7"/></g>`);
await save('floor',`<rect x="0" y="0" width="128" height="128" fill="#797e99"/><path d="M3 3h122v122H3z" fill="#a0a4b8"/><path d="M6 6h117v117H6z" fill="#9ba2b7"/><path d="M6 6h116M6 6v115" stroke="#bdc4cf" stroke-width="3"/><path d="M10 121h111v-9" fill="none" stroke="#858da5" stroke-width="3"/><path d="M15 25l13-7m69 81 13-3m-41-45 10 1" fill="none" stroke="#c5c9d6" stroke-opacity=".3" stroke-width="2"/>`,128,128);
await save('wall',`<path d="M2 35L24 9h101v89l-23 27H2z" fill="#44466b"/><path d="M3 36h101v87H3z" fill="#6b6386"/><path d="M4 37l21-26h99l-21 26z" fill="#a99ab7"/><path d="M104 38l20-26v84l-20 27z" fill="#555273"/><path d="M12 47h84v10H12z" fill="#8b80a0"/><path d="M5 102h97v20H5z" fill="#5b5479"/><path d="M10 41h88m-89 0v57" stroke="#bdacc4" stroke-width="4"/><path d="M32 70l15 3-4 8m31 11 17 2" stroke="#514c73" stroke-width="3" fill="none"/>`,128,128);
await save('droplet',`<path d="M16 1Q-1 19 8 28q8 8 17-1Q34 19 16 1" fill="#74edff"/><path d="M11 19q-4 7 4 7" stroke="#e5ffff" stroke-width="3" fill="none"/>`,32,32);
await save('spark',`<path d="M32 0l8 24 24 8-24 8-8 24-8-24L0 32l24-8z" fill="#ffe18b"/><path d="M32 12v40M12 32h40" stroke="white" stroke-width="3"/>`,64,64);
await save('glow',`<circle cx="128" cy="128" r="125" fill="url(#light)"/>`);
await save('marker',`<path d="M35 13q67-29 86 28 14 45-23 64l-18 28-10-24Q17 106 17 62q0-30 18-49" fill="url(#orange)" stroke="#153454" stroke-width="7"/><path d="M64 30l25-1-7 43-14 1z" fill="#183c5c"/><circle cx="75" cy="89" r="8" fill="#183c5c"/><path d="M40 29q20-12 40-8" fill="none" stroke="#fff2ba" stroke-width="6" stroke-linecap="round"/>`,145,145);
const original=async name=>readFile(new URL(name+'.svg',out),'utf8');
await writeFile(new URL('valve-closed.svg',out),(await original('valve')).replace('fill="url(#red)"','fill="url(#green)"').replace('#ff8f49','#9ce89c'));
await writeFile(new URL('plate-active.svg',out),(await original('plate')).replace('#ffca5d','#6ce3ab').replace('#fff3ac','#c8ffe5'));
await writeFile(new URL('leak-off.svg',out),(await original('leak')).replace(/<path d="M116[\s\S]*?<\/g>/,'</g>'));
const floor=await original('floor');
await writeFile(new URL('floor-kitchen.svg',out),floor);
await writeFile(new URL('floor-office.svg',out),floor.replaceAll('#9ba2b7','#96b0bf').replaceAll('#a0a4b8','#9ebbc8').replaceAll('#bdc4cf','#c4d8df'));
await writeFile(new URL('floor-basement.svg',out),floor.replaceAll('#9ba2b7','#7e9cae').replaceAll('#a0a4b8','#88a6b7').replaceAll('#bdc4cf','#a9c5d4'));
console.log('Original game artwork written to public/game2/.');
