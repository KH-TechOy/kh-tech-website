import React from 'react';

type Press={element:HTMLButtonElement;handled:boolean;released:boolean;timer?:ReturnType<typeof setTimeout>};
type Input={begin:(id:number,element:HTMLButtonElement,handled:boolean)=>void;handled:(id:number)=>void;onReset:(callback:()=>void)=>()=>void};
const InputContext=React.createContext<Input|null>(null);

// A consumed gesture survives a view change, so its compatibility click cannot
// activate a different button that appears under the released finger.
export function ActionInputScope({children}:{children:React.ReactNode}){
  const presses=React.useRef(new Map<number,Press>()),resets=React.useRef(new Set<()=>void>());
  const input=React.useMemo<Input>(()=>({
    begin(id,element,handled){const old=presses.current.get(id);if(old?.timer)clearTimeout(old.timer);presses.current.set(id,{element,handled,released:false})},
    handled(id){const press=presses.current.get(id);if(press)press.handled=true},
    onReset(callback){resets.current.add(callback);return()=>{resets.current.delete(callback)}},
  }),[]);
  React.useEffect(()=>{
    const remove=(id:number)=>{const press=presses.current.get(id);if(press?.timer)clearTimeout(press.timer);presses.current.delete(id)};
    const release=(event:PointerEvent)=>{const press=presses.current.get(event.pointerId);if(press){press.released=true;press.timer=setTimeout(()=>remove(event.pointerId),0)}};
    const cancel=(event:PointerEvent)=>remove(event.pointerId);
    const click=(event:MouseEvent)=>{
      const pointerEvent=event as PointerEvent;
      if(event.detail===0&&!pointerEvent.pointerType)return;
      const match=typeof pointerEvent.pointerId==='number'&&pointerEvent.pointerId>=0
        ?[pointerEvent.pointerId,presses.current.get(pointerEvent.pointerId)] as const
        :[...presses.current.entries()].reverse().find(([,press])=>press.released);
      if(!match?.[1])return;
      const [id,press]=match,target=event.target instanceof Element?event.target.closest('button'):null;
      remove(id);
      if(press.handled||press.element!==target){event.preventDefault();event.stopPropagation()}
    };
    const clear=()=>{for(const id of presses.current.keys())remove(id)};
    const reset=()=>{clear();for(const callback of resets.current)callback()};
    const visibility=()=>{if(document.hidden)reset()};
    document.addEventListener('pointerup',release,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('click',click,true);
    window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility);
    return()=>{clear();document.removeEventListener('pointerup',release,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('click',click,true);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility)};
  },[]);
  return <InputContext.Provider value={input}>{children}</InputContext.Provider>;
}

type Props=Omit<React.ButtonHTMLAttributes<HTMLButtonElement>,'onClick'> & {label?:string;activateOnRelease?:boolean;onAction:()=>void};
export function ActionButton({className='',label,activateOnRelease=false,onAction,children,...attributes}:Props){
  const input=React.useContext(InputContext);
  if(!input)throw new Error('ActionButton requires ActionInputScope');
  const [held,setHeld]=React.useState(false),pointer=React.useRef<number|null>(null);
  const reset=()=>{pointer.current=null;setHeld(false)};
  React.useEffect(()=>input.onReset(reset),[input]);
  function down(event:React.PointerEvent<HTMLButtonElement>){
    if(event.button!==0||pointer.current!==null)return;
    event.preventDefault();pointer.current=event.pointerId;setHeld(true);
    input!.begin(event.pointerId,event.currentTarget,!activateOnRelease);
    event.currentTarget.focus({preventScroll:true});
    try{event.currentTarget.setPointerCapture(event.pointerId)}catch{/* Click-only input remains supported. */}
    if(!activateOnRelease)onAction();
  }
  function up(event:React.PointerEvent<HTMLButtonElement>){
    if(pointer.current!==event.pointerId)return;
    reset();if(activateOnRelease){input!.handled(event.pointerId);onAction()}
  }
  return <button {...attributes} type="button" className={className+(held?' is-held':'')} aria-label={label||attributes['aria-label']}
    onPointerDown={down} onPointerUp={up} onPointerCancel={reset} onLostPointerCapture={reset} onClick={onAction}>
    {children}
  </button>;
}
