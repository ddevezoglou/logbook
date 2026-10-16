/* Standalone design study. No app imports, storage, network or real form writes. */
const lessons = {
  sets: { label:'Συμπλήρωση σετ', steps:[
    ['Γράψε τις επαναλήψεις.', 'Ένα σετ με 8 επαναλήψεις.'],
    ['Συμπλήρωσε το βάρος.', 'Εδώ χρησιμοποιούμε κιλά: 60 kg.'],
    ['Αντέγραψε το πρώτο σετ.', 'Όταν οι τιμές είναι ίδιες, ένα πάτημα αρκεί.'],
    ['Τα υπόλοιπα σετ συμπληρώθηκαν.', 'Μπορείς να αλλάξεις κάθε τιμή ξεχωριστά.'],
  ]},
  swipe: { label:'Αλλαγή άσκησης', steps:[
    ['Ακούμπησε την κάρτα.', 'Ξεκίνα από τον τίτλο της άσκησης.'],
    ['Σύρε προς τα αριστερά.', 'Έρχεται η επόμενη άσκηση.'],
    ['Σύρε προς τα δεξιά.', 'Επιστρέφεις στην προηγούμενη.'],
    ['Ή χρησιμοποίησε τα βέλη.', 'Η ίδια κίνηση γίνεται με ένα πάτημα.'],
  ]},
  plan: { label:'Νέο πρόγραμμα', steps:[
    ['Δώσε όνομα στο πρόγραμμα.', 'Για παράδειγμα, Upper / Lower.'],
    ['Όρισε τη διάρκεια.', 'Στο παράδειγμα, ένας κύκλος 7 ημερών.'],
    ['Πάτησε «Δημιουργία».', 'Η νέα κάρτα εμφανίζεται στα προγράμματά σου.'],
    ['Το αστέρι το κάνει ενεργό.', 'Το πρόγραμμα με ★ ανοίγει στην Καταγραφή.'],
  ]},
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const players = new Map();
let active = null;
const stepDuration = 4200;
const ease = value => { const t = Math.max(0, Math.min(1,value)); return t*t*t*(t*(t*6-15)+10); };
const chevron = direction => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction==='left'?'m15 5-7 7 7 7':'m9 5 7 7-7 7'}"/></svg>`;
const gestureHint = `<div class="gesture-hint"><svg viewBox="0 0 320 48" aria-hidden="true"><path class="gesture-path" pathLength="1" d="M270 14 C220 42 105 42 50 14"/><path class="gesture-head" d="m64 12-14 2 5 14"/></svg><span>σύρε απαλά προς τα αριστερά</span></div>`;

function animateIn(element, keyframes, duration=420) {
  if(reducedMotion.matches) return;
  element.getAnimations().forEach(animation=>animation.cancel());
  element.animate(keyframes,{duration,easing:'cubic-bezier(.22,.68,.25,1)',fill:'none'});
}
function setValue(element, value) {
  if(element.textContent===value) return;
  element.textContent=value;
  animateIn(element,[{opacity:.25,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],300);
}

function exercise(name, index) {
  return `<div class="exercise"><div class="exercise-inner"><i class="paper-tape"></i><div class="exercise-top"><span>ΑΣΚΗΣΗ ${index + 1}</span><span class="set-tag">3 ΣΕΤ</span></div><h4>${name}</h4><div class="table-head"><span>ΣΕΤ</span><span>ΕΠΑΝ.</span><span></span><span>ΒΑΡΟΣ</span><span></span></div>${[0,1,2].map(row => `<div class="demo-row"><small>0${row+1}</small><label class="demo-field reps-${row}"><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><output data-reps="${row}"></output></label><span>×</span><div class="load-cell"><span class="unit-choice">Κιλά⌄</span><label class="demo-field weight-${row}"><span>ΒΑΡΟΣ (kg)</span><output data-weight="${row}"></output></label></div><span class="remove-mark">−</span></div>`).join('')}<div class="card-foot"><span class="demo-copy">ΑΝΤΙΓΡΑΦΗ</span><span>＋ Extra σετ</span></div></div></div>`;
}

class Player {
  constructor(root, id) {
    this.root = root;
    this.id = id;
    this.lesson = 'swipe';
    this.step = 0;
    this.elapsed = 0;
    this.playing = false;
    root.innerHTML = `<div class="lesson-tabs" role="group" aria-label="Θέμα επίδειξης">${Object.entries(lessons).map(([key,lesson])=>`<button data-lesson="${key}" aria-pressed="${key === 'sets'}">${lesson.label}</button>`).join('')}</div><div class="player-stage"><div class="demo-label"><span>ΕΠΙΔΕΙΞΗ · ΕΝΔΕΙΚΤΙΚΑ ΣΤΟΙΧΕΙΑ</span><span class="scene-position">01 / 02</span></div><div class="scene" aria-hidden="true"></div></div><div class="caption" role="status" aria-live="polite"><span class="step-number"></span><div><p></p><small></small></div></div><div class="player-controls"><div class="timeline" role="group" aria-label="Βήματα επίδειξης"></div><div class="transport"><button class="prev" aria-label="Προηγούμενο βήμα">←</button><button class="play">▶ Αναπαραγωγή</button><button class="next" aria-label="Επόμενο βήμα">→</button><span class="count"></span><button class="restart" aria-label="Επανάληψη από την αρχή">↺</button></div></div><details class="text-version"><summary>Τα βήματα σε κείμενο</summary><ol></ol></details>`;
    this.scene = root.querySelector('.scene');
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.lesson) {
        this.pause(); this.lesson = button.dataset.lesson; this.mount(); this.start(!reducedMotion.matches);
      } else if (button.dataset.step !== undefined) this.jump(Number(button.dataset.step));
      else if (button.classList.contains('play')) this.playing ? this.pause() : this.resume();
      else if (button.classList.contains('prev')) this.jump(this.step-1);
      else if (button.classList.contains('next')) this.jump(this.step+1);
      else if (button.classList.contains('restart')) this.start(!reducedMotion.matches);
    });
    this.mount();
  }
  mount() {
    const lesson = lessons[this.lesson];
    this.root.querySelectorAll('[data-lesson]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lesson===this.lesson)));
    this.root.querySelector('.timeline').innerHTML = lesson.steps.map(([caption],index)=>`<button data-step="${index}" aria-label="Βήμα ${index+1}: ${caption}"></button>`).join('');
    this.root.querySelector('.text-version ol').innerHTML = lesson.steps.map(([caption,detail])=>`<li>${caption} ${detail}</li>`).join('');
    this.scene.innerHTML = this.lesson === 'plan'
      ? `<div class="plan-form"><h4>Νέο πρόγραμμα</h4><label class="demo-field name-target"><span>ΟΝΟΜΑ ΠΡΟΓΡΑΜΜΑΤΟΣ</span><output class="name-output"></output></label><label class="demo-field duration-target"><span>ΔΙΑΡΚΕΙΑ ΚΥΚΛΟΥ · ΗΜΕΡΕΣ</span><output class="duration-output"></output></label><div class="create-button">ΔΗΜΙΟΥΡΓΙΑ</div></div><div class="routine-result" hidden><small class="active-label">ΠΡΟΓΡΑΜΜΑ</small><h4>Upper / Lower</h4><p>ΔΙΑΡΚΕΙΑ: 7 ΗΜΕΡΕΣ</p><span class="star-target">☆</span></div><span class="finger"></span>`
      : `<div class="deck-arrows"><span class="arrow-left">${chevron('left')}</span><small>ΑΣΚΗΣΗ <b class="card-count">1</b> / 2</small><span class="arrow-right">${chevron('right')}</span></div><div class="deck">${exercise('Πιέσεις πάγκου',0)}${exercise('Κωπηλατική',1)}</div>${gestureHint}<span class="finger"></span>`;
    this.root.querySelector('.scene-position').textContent = this.lesson==='plan' ? 'ΠΡΟΓΡΑΜΜΑ' : 'ΚΑΤΑΓΡΑΦΗ';
    this.scene.dataset.lesson=this.lesson;
    if(this.lesson!=='plan') this.paintDeck(0);
    animateIn(this.scene,[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],500);
  }
  start(autoplay=true) {
    this.pause(); this.step=0; this.elapsed=autoplay ? 0 : stepDuration;
    this.caption(); this.paint(this.elapsed/stepDuration);
    if (autoplay) this.resume();
  }
  pause() { this.playing=false; cancelAnimationFrame(this.raf); this.root.getAnimations({subtree:true}).forEach(animation=>animation.pause()); this.controls(); }
  resume() {
    for (const player of players.values()) if(player !== this) player.pause();
    if(this.elapsed >= stepDuration) { if(this.step === 3) this.step=0; this.elapsed=0; this.caption(); }
    this.playing=true; this.last=performance.now(); this.controls();
    this.root.getAnimations({subtree:true}).forEach(animation=>animation.play());
    this.raf=requestAnimationFrame(time=>this.tick(time));
  }
  tick(time) {
    if(!this.playing) return;
    this.elapsed += Math.min(time-this.last,80); this.last=time;
    if(this.elapsed >= stepDuration) {
      this.paint(1);
      if(this.step === 3) { this.elapsed=stepDuration; this.pause(); return; }
      this.step++; this.elapsed=0; this.caption();
    }
    this.paint(this.elapsed/stepDuration);
    this.raf=requestAnimationFrame(next=>this.tick(next));
  }
  jump(index) {
    this.pause(); this.step=Math.max(0,Math.min(3,index)); this.elapsed=stepDuration;
    this.caption(); this.paint(1);
  }
  caption() {
    const [title,detail]=lessons[this.lesson].steps[this.step];
    this.root.querySelector('.step-number').textContent=String(this.step+1).padStart(2,'0');
    this.root.querySelector('.caption p').textContent=title;
    this.root.querySelector('.caption small').textContent=detail;
    animateIn(this.root.querySelector('.caption'),[{opacity:.15,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],450);
    this.root.querySelectorAll('[data-step]').forEach((button,index)=>{
      if(index===this.step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
      button.classList.toggle('done',index<this.step);
    });
    this.controls();
  }
  controls() {
    this.root.querySelector('.play').textContent=this.playing?'Ⅱ Παύση':this.step===3&&this.elapsed>=stepDuration?'▶ Ξανά':'▶ Αναπαραγωγή';
    this.root.querySelector('.prev').disabled=this.step===0;
    this.root.querySelector('.next').disabled=this.step===3;
    this.root.querySelector('.count').textContent=`${this.step+1} / 4`;
  }
  point(target, progress, horizontal=0) {
    const finger=this.scene.querySelector('.finger');
    if(!target) { finger.style.opacity='0'; return; }
    const box=target.getBoundingClientRect(), sceneBox=this.scene.getBoundingClientRect();
    finger.style.left=`${box.left-sceneBox.left+box.width/2+horizontal}px`;
    finger.style.top=`${box.top-sceneBox.top+box.height*.65}px`;
    finger.style.opacity=progress>.08&&progress<.86?'1':'0';
    finger.classList.toggle('pressing',progress>.23&&progress<.56);
  }
  highlight(target) {
    if(target===this.highlighted) return;
    this.highlighted?.classList.remove('active-target');
    target?.classList.add('active-target');
    this.highlighted=target;
  }
  paintDeck(position) {
    this.scene.querySelectorAll('.exercise').forEach((card,index)=>{
      const offset=index-position, distance=Math.min(1,Math.abs(offset));
      card.style.transform=`translateX(${offset*94}%) translateY(${distance*5}px) rotate(${offset*1.1}deg) scale(${1-distance*.035})`;
      card.style.opacity=String(1-distance*.25);
      card.style.zIndex=String(Math.abs(offset)<.5?2:1);
    });
    this.scene.querySelector('.card-count').textContent=position>.5?'2':'1';
  }
  paint(progress) {
    const p=Math.max(0,Math.min(1,progress)), step=this.step;
    let target;
    if(this.lesson==='sets') {
      const first=this.scene.querySelector('.exercise');
      for(let row=0;row<3;row++) {
        const copied=step===3&&p>(row-1)*.15+.1;
        setValue(first.querySelector(`[data-reps="${row}"]`),row===0 ? (step>0||p>.35?'8':'') : copied?'8':'');
        setValue(first.querySelector(`[data-weight="${row}"]`),row===0 ? (step>1?'60':step===1?(p>.55?'60':p>.3?'6':''):'') : copied?'60':'');
      }
      target=first.querySelector(step===0?'.reps-0':step===1?'.weight-0':step===2?'.demo-copy':'.demo-row:nth-of-type(4)');
      if(step===3) target=first.querySelector('.exercise-inner');
      this.scene.querySelector('.gesture-hint').hidden=true;
    } else if(this.lesson==='swipe') {
      this.scene.querySelectorAll('[data-reps]').forEach(node=>node.textContent='8');
      this.scene.querySelectorAll('[data-weight]').forEach(node=>node.textContent='60');
      const move=ease((p-.32)/.48);
      const position=step===0?0:step===1?move:step===2?1-move:ease((p-.4)/.36);
      this.paintDeck(position);
      const hint=this.scene.querySelector('.gesture-hint');
      const right=step===2;
      hint.hidden=false;
      hint.classList.toggle('rightward',right);
      hint.classList.toggle('tap-hint',step===3);
      hint.querySelector('span').textContent=step===0?'ακούμπησε εδώ, πάνω στην κάρτα':step===1?'σύρε απαλά προς τα αριστερά':step===2?'και πίσω, προς τα δεξιά':'ή πάτησε το μικρό βέλος';
      hint.querySelector('.gesture-path').style.strokeDashoffset=String(1-ease(p/.28));
      hint.querySelector('.gesture-head').style.opacity=String(ease((p-.15)/.15));
      target=step===3?this.scene.querySelector('.arrow-right'):this.scene.querySelector('.deck');
      this.highlight(step===3?target:null);
      if(step===3) { this.point(target,p); }
      else {
        const finger=this.scene.querySelector('.finger');
        finger.style.left=`${step===0?65:step===1?65-move*35:30+move*35}%`;
        finger.style.top='93px';finger.style.opacity=String(Math.min(ease(p/.15),1-ease((p-.8)/.2))*.8);finger.classList.toggle('pressing',step>0);
      }
      return;
    } else {
      const created=step>2||(step===2&&p>.6);
      const form=this.scene.querySelector('.plan-form'), result=this.scene.querySelector('.routine-result');
      const reveal=step>2?1:step===2?ease((p-.5)/.28):0;
      form.hidden=reveal===1; result.hidden=reveal===0;
      form.style.opacity=String(1-reveal); form.style.transform=`translateY(${-reveal*8}px)`;
      result.style.opacity=String(reveal); result.style.transform=`translateY(${(1-reveal)*12}px)`;
      const name='Upper / Lower';
      this.scene.querySelector('.name-output').textContent=step>0?name:name.slice(0,Math.floor(ease((p-.15)/.6)*name.length));
      this.scene.querySelector('.duration-output').textContent=step>1||(step===1&&p>.4)?'7':'';
      const activated=step===3&&p>.45;
      this.scene.querySelector('.star-target').textContent=activated?'★':'☆';
      this.scene.querySelector('.active-label').textContent=activated?'ΣΕ ΙΣΧΥ':'ΠΡΟΓΡΑΜΜΑ';
      target=this.scene.querySelector(step===0?'.name-target':step===1?'.duration-target':step===2?(created?'.routine-result':'.create-button'):'.star-target');
    }
    this.highlight(target); this.point(target,p);
  }
}

document.querySelectorAll('[data-player]').forEach(root=>players.set(root.dataset.player,new Player(root,root.dataset.player)));
function closeGuide(id) {
  players.get(id).pause();
  if(id==='b') document.querySelector('#guide-b').close();
  else {
    document.querySelector(`#guide-${id}`).hidden=true;
    document.querySelector(`[data-open="${id}"]`).setAttribute('aria-expanded','false');
    if(id==='c') document.querySelector('#c-idle').hidden=false;
  }
  if(active===id) active=null;
}
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.open;
  if(active===id) { closeGuide(id); return; }
  if(active) closeGuide(active);
  active=id;
  if(id==='b') document.querySelector('#guide-b').showModal();
  else {
    document.querySelector(`#guide-${id}`).hidden=false;
    button.setAttribute('aria-expanded','true');
    if(id==='c') document.querySelector('#c-idle').hidden=true;
  }
  players.get(id).start(!reducedMotion.matches);
  animateIn(document.querySelector(`#guide-${id}`),[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],550);
}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.close;closeGuide(id);document.querySelector(`[data-open="${id}"]`).focus();
}));
document.querySelector('#guide-b').addEventListener('close',()=>{players.get('b').pause();if(active==='b')active=null;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&active!=='b'){const id=active;closeGuide(id);document.querySelector(`[data-open="${id}"]`).focus();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(player=>player.pause());});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)players.forEach(player=>player.jump(player.step));});
window.addEventListener('resize',()=>players.forEach(player=>{if(!player.playing)player.paint(player.elapsed/stepDuration);}));
