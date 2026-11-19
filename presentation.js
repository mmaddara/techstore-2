(() => {
 const body=document.body,hero=document.querySelector('.experience'),header=document.querySelector('.site-header');
 if(!hero)return;
 const arrival=document.querySelector('.arrival'),video=document.querySelector('.arrival-video'),videoPause=document.querySelector('.arrival-pause');
 const invitation=document.querySelector('.presentation-invitation'),touchMenu=document.querySelector('[data-presentation-menu]');
 const pointer=matchMedia('(hover:hover) and (pointer:fine)'),motion=matchMedia('(prefers-reduced-motion:reduce)');
 let topTimer,bottomTimer,scrollFrame=0;
 function reveal(edge,show){
  const key=`presentation-${edge}-visible`;
  clearTimeout(edge==='top'?topTimer:bottomTimer);
  if(show){body.classList.add(key);return;}
  const timer=setTimeout(()=>body.classList.remove(key),420);
  if(edge==='top')topTimer=timer;else bottomTimer=timer;
 }
 document.addEventListener('pointermove',event=>{
  if(!pointer.matches||event.pointerType!=='mouse')return;
  const rect=(arrival&&arrival.getBoundingClientRect().bottom>100?arrival:hero).getBoundingClientRect();
  if(rect.bottom<=100)return;
  reveal('top',event.clientY<Math.max(115,header.getBoundingClientRect().bottom+18)&&event.clientY<innerHeight*.35);
  reveal('bottom',event.clientY>Math.min(innerHeight,rect.bottom)-170||invitation.contains(event.target));
 },{passive:true});
 document.documentElement.addEventListener('pointerleave',()=>{reveal('top',false);reveal('bottom',false);});
 document.addEventListener('keydown',event=>{
  if(event.key==='Tab')body.classList.add('is-keyboard');
  if(event.key==='Escape'){body.classList.remove('presentation-top-visible','presentation-bottom-visible');header.querySelector('details')?.removeAttribute('open');}
 });
 document.addEventListener('pointerdown',event=>{
  body.classList.remove('is-keyboard');
  if(!pointer.matches&&!header.contains(event.target)&&event.target!==touchMenu)reveal('top',false);
 },{passive:true});
 touchMenu.addEventListener('click',event=>{reveal('top',true);const menu=header.querySelector('details');menu.open=true;menu.querySelector('summary').focus({preventScroll:true});});
 function scrollState(){
  scrollFrame=0;const rect=hero.getBoundingClientRect(),progress=Math.max(0,Math.min(1,-rect.top/rect.height));
  hero.style.setProperty('--presentation-progress',motion.matches?0:progress);
  body.classList.toggle('presentation-content',rect.bottom<110);
  if(progress>.1){reveal('bottom',false);reveal('top',false);}
 }
 addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollState);},{passive:true});
 addEventListener('resize',scrollState);scrollState();
 if(video){
  let manuallyPaused=false,inView=true;
  function syncVideo(){if(motion.matches||manuallyPaused||!inView||document.hidden)video.pause();else video.play().catch(()=>{});}
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncVideo();},{threshold:.05}).observe(arrival);
  videoPause.addEventListener('click',()=>{manuallyPaused=!manuallyPaused;videoPause.setAttribute('aria-pressed',String(manuallyPaused));videoPause.setAttribute('aria-label',manuallyPaused?'Продолжить фоновое видео':'Остановить фоновое видео');videoPause.textContent=manuallyPaused?'▷':'Ⅱ';syncVideo();});
  video.addEventListener('error',()=>arrival.classList.add('video-unavailable'));
  motion.addEventListener('change',syncVideo);document.addEventListener('visibilitychange',syncVideo);syncVideo();
 }
 const choices=[...hero.querySelectorAll('[data-scene-choice]')];
 for(const [selector,direction] of [['[data-presentation-prev]',-1],['[data-presentation-next]',1]])document.querySelector(selector).addEventListener('click',()=>{const index=choices.findIndex(b=>b.dataset.sceneChoice===hero.dataset.scene);choices[(index+direction+choices.length)%choices.length].click();});
 document.querySelector('[data-presentation-reset]').addEventListener('click',()=>document.querySelector('[data-model-reset]').click());
})();
