/*
  Scroll World 7.1: the opening film is a single autoplay ending on its last frame.
  The other two scenes keep native sticky scroll runways (390-440vh).
  Pinning is achieved by the browser compositor instead of wheel/touch event traps;
  vertical scrolling naturally progresses exactly one film at a time.
  This avoids iOS Safari's expensive/random-seek behavior on heavily compressed MP4s.
*/
(() => {
 'use strict';
 const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
 
 const sceneElements=[...document.querySelectorAll('.scroll-scene:not(.hero-once)')];
 const scenes=sceneElements.map((el,i)=>{
   const canvas=el.querySelector('canvas');
   return {el, canvas, ctx:canvas.getContext('2d',{alpha:false}), index:Number(el.dataset.scene)||i+2, stage:el.querySelector('.pin-stage'), beats:[...el.querySelectorAll('.story-beat')], frames:Number(el.dataset.frames)||180, cache:new Map(), pending:new Set(), idx:-1, progress:0, displayed:-1, active:false};
 });
 let scheduled=false,nowScrolling=false,reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const hero=document.querySelector('.hero-once');
 const heroVideo=hero?.querySelector('.hero-autoplay');
 const heroPlayButton=hero?.querySelector('.intro-play-button');
 let heroFinished=false;
 let heroLastProgress=0;
 function heroProgress(){
   if(heroFinished)return 1;
   const duration=heroVideo?.duration;
   if(!heroVideo || !Number.isFinite(duration)||duration<=0)return heroLastProgress;
   return clamp(heroVideo.currentTime/duration,0,1);
 }
 function finishHero(){
   if(heroFinished)return;
   heroFinished=true;
   heroLastProgress=1;
   heroVideo.pause();
   // Keep the very last decoded picture; never rewind or restart until page reload.
   if(Number.isFinite(heroVideo.duration)&&heroVideo.duration>0 && !heroVideo.seeking){
     const finalTime=Math.max(0,heroVideo.duration-0.03);
     if(heroVideo.currentTime<finalTime)heroVideo.currentTime=finalTime;
   }
   heroPlayButton?.setAttribute('hidden','');
   visuals({beats:[...hero.querySelectorAll('.story-beat')]},1);
   schedule();
 }
 if(heroVideo){
   heroVideo.loop=false;
   heroVideo.muted=true;
   heroVideo.controls=false;
   heroVideo.setAttribute('playsinline','');
   heroVideo.setAttribute('webkit-playsinline','');
   const heroBeats=[...hero.querySelectorAll('.story-beat')];
   const paintHero=()=>{
     const p=heroProgress();
     heroLastProgress=Math.max(heroLastProgress,p);
     visuals({beats:heroBeats},p);
     schedule();
   };
   heroVideo.addEventListener('timeupdate',paintHero,{passive:true});
   heroVideo.addEventListener('ended',finishHero,{once:true});
   heroVideo.addEventListener('loadedmetadata',paintHero,{once:true});
   heroVideo.addEventListener('pause',()=>{if(heroVideo.ended)finishHero()});
   const startIntro=()=>{
     if(heroFinished)return;
     heroPlayButton?.setAttribute('hidden','');
     const promise=heroVideo.play();
     if(promise?.catch){promise.catch(()=>{
       if(!heroFinished)heroPlayButton?.removeAttribute('hidden');
     });}
   };
   // iOS may prohibit autoplay in Low Power Mode. Only then show a start control.
   heroPlayButton?.addEventListener('click',startIntro);
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startIntro,{once:true});
   else startIntro();
   visuals({beats:heroBeats},0);
 }

 function path(s,index){const version='v21';return `assets/frames/${version}/scene${s.index}/${String(index+1).padStart(3,'0')}.webp`}
 function requestFrame(s,index){
   index=clamp(index,0,s.frames-1);
   if(s.cache.has(index)||s.pending.has(index))return;
   // Keep decoded images bounded on mobile: request only a local frame window.
   if(s.pending.size >= (innerWidth <= 800 ? 6 : 9))return;
   s.pending.add(index);
   const img=new Image();
   img.decoding='async';
   img.onload=()=>{s.pending.delete(index);s.cache.set(index,img);s.stage.classList.add('canvas-ready');
      const cacheLimit=innerWidth<=800?11:24;
      if(s.cache.size>cacheLimit){const order=[...s.cache.keys()].sort((a,b)=>Math.abs(b-s.idx)-Math.abs(a-s.idx));while(s.cache.size>cacheLimit){const k=order.shift();if(k!==undefined&&k!==s.idx)s.cache.delete(k);else break}}
      schedule();};
   img.onerror=()=>{s.pending.delete(index);};
   img.src=path(s,index);
 }
 function cover(ctx,img,w,h){const ratio=Math.max(w/img.width,h/img.height),dw=img.width*ratio,dh=img.height*ratio;ctx.drawImage(img,(w-dw)*.5,(h-dh)*.5,dw,dh)}
 function sizeCanvas(s){
   const bounds=s.stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.55);
   const w=Math.max(1,Math.round(bounds.width*dpr)),h=Math.max(1,Math.round(bounds.height*dpr));
   if(s.canvas.width!==w||s.canvas.height!==h){s.canvas.width=w;s.canvas.height=h;s.displayed=-1;}
 }
 function draw(s){
   if(!s.ctx)return;
   if(s.idx===s.displayed)return;
   let img=s.cache.get(s.idx),used=s.idx;
   if(!img){
     // Use closest already decoded frame instead of a blank frame while fetching.
     for(let dist=1;dist<=10&&!img;dist++){
       const low=s.idx-dist,high=s.idx+dist;
       if(low>=0&&s.cache.has(low)){img=s.cache.get(low);used=low}
       else if(high<s.frames&&s.cache.has(high)){img=s.cache.get(high);used=high}
     }
   }
   if(!img)return;
   sizeCanvas(s);cover(s.ctx,img,s.canvas.width,s.canvas.height);s.displayed=used;
 }
 function visuals(s,p){
   for(const beat of s.beats){
     const start=parseFloat(beat.dataset.in)||0,end=parseFloat(beat.dataset.out)||1;
     const smooth=t=>t*t*(3-2*t);
     const enter=smooth(clamp((p-start)/.085,0,1)),leave=end>=1?1:smooth(clamp((end-p)/.085,0,1)),opacity=Math.min(enter,leave);
     beat.style.opacity=opacity.toFixed(3);
     beat.style.transform=innerWidth<801?`translate3d(0,${((1-opacity)*25).toFixed(1)}px,0)`:`translate3d(0,calc(-42% + ${((1-opacity)*25).toFixed(1)}px),0)`;
     beat.classList.toggle('is-visible',opacity>.5);
   }
 }
 function update(){
   scheduled=false;
   const viewport=window.innerHeight,y=window.scrollY;

   
   const header=document.getElementById('site-header');
   if(header){
     const heroRect=hero.getBoundingClientRect();
     // Navigation appears as the opening film closes, or when the user navigates past it.
     const reveal=heroProgress()>=.86 || heroRect.bottom<=viewport*.7;
     header.classList.toggle('header-hidden',!reveal);
     header.classList.toggle('header-visible',reveal);
     header.setAttribute('aria-hidden',reveal?'false':'true');
     header.inert=!reveal;
     // Light typography when the menu overlays ivory sections.
     const centerY=Math.min(140,viewport*.35);
     const under=document.elementFromPoint(Math.min(innerWidth*.5,innerWidth-10),centerY);
     const onLight=!!under?.closest('.story-divider,.partners.is-light,.contact.is-light,.location-map.is-light,.about-content');
     header.classList.toggle('on-light',onLight);
   }
   for(const s of scenes){
     const rect=s.el.getBoundingClientRect();
     const visible=rect.bottom>0&&rect.top<viewport;
     const near=rect.bottom>-viewport*.5&&rect.top<viewport*1.5;
     if(!near)continue;
     s.active=visible;
     const travel=Math.max(1,s.el.offsetHeight-viewport);
     // sticky stage stays pinned from zero to 100%; release only once last frame is reached.
     const p=clamp(-rect.top/travel,0,1);
     s.progress=p;
     const idx=Math.round(p*(s.frames-1));
     s.idx=idx;
     if(visible)visuals(s,p);
     requestFrame(s,idx);draw(s);
     if(visible){
       // Direction-aware localized prefetch, no downloading all frames into memory.
       let direction=s.prevP===undefined||p>=s.prevP?1:-1;s.prevP=p;
       for(let j=1;j<=(innerWidth<=800?3:4);j++)requestFrame(s,idx+j*direction);
       for(let j=1;j<=(innerWidth<=800?1:2);j++)requestFrame(s,idx-j*direction);
     }else{requestFrame(s,0)}
   }
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update)}}
 function onResize(){for(const s of scenes){s.displayed=-1;sizeCanvas(s)}schedule()}
 const onScroll=()=>{nowScrolling=true;schedule()};
 addEventListener('scroll',onScroll,{passive:true});
 addEventListener('resize',onResize,{passive:true});
 addEventListener('orientationchange',onResize,{passive:true});
 addEventListener('pageshow',onResize);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 // Critical initial paint: always show first frame, even before the first scroll.
 for(const s of scenes){sizeCanvas(s);requestFrame(s,0);visuals(s,0)}
 schedule();
})();
