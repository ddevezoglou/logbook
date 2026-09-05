async page => {
  await page.evaluate(() => {
    localStorage.setItem('logbookGuestReminderAt', String(Date.now()));
    localStorage.setItem('trainingExercises', JSON.stringify([
      { id:'qa-row', name:'Κωπηλατική τροχαλίας', notes:'Σταθερός κορμός · πλήρες εύρος', createdAt:1, updatedAt:1 },
      { id:'qa-squat', name:'Squat', notes:'', createdAt:1, updatedAt:1 }
    ]));
    localStorage.setItem('trainingRoutines', JSON.stringify([{id:'qa-routine',name:'Strength / Φθινόπωρο',isActive:true,cycleLength:7,usesWeekdays:false,plan:[{id:'qa-day',exerciseId:'qa-row',cycleDay:1,day:null,workoutName:'Upper body',exercise:'Κωπηλατική τροχαλίας',workSets:3,cues:''}]}]));
    localStorage.setItem('trainingSessions', JSON.stringify(Array.from({length:31},(_,i)=>({id:'qa-session-'+i,date:'2026-09-'+String(5-(i%5)).padStart(2,'0'),type:'free',workoutName:'Upper body / Δύναμη και τεχνική',comments:'Σταθερή πρόοδος, με έλεγχο στην επιστροφή.',exercises:[{exercise:'Κωπηλατική τροχαλίας',exerciseId:'qa-row',sets:[{reps:10,weight:40}]}]}))));
  });
  await page.reload();
  await page.waitForFunction(()=>document.body.classList.contains('app-ready'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addStyleTag({url:'/e2e/fixtures/no-animations.css'});
  async function nav(view) {
    await page.locator('#open-menu').click();
    await page.locator('#side-menu [data-view='+view+']').click();
    await page.waitForFunction(v=>document.querySelector('#'+v+'-view').classList.contains('active'),view);
  }
  async function shot(name) {
    await page.evaluate(()=>document.fonts.ready);
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Overflow: '+name);
    await page.screenshot({path:'output/playwright/'+name+'.png',fullPage:true,animations:'disabled'});
  }
  await nav('plan');
  await page.setViewportSize({width:1440,height:1000});
  await shot('polish-plan-desktop');
  await page.setViewportSize({width:390,height:844});
  await shot('polish-plan-mobile');
  await page.locator('.routine-add-workout').click();
  await shot('polish-plan-editor-mobile');
  await page.keyboard.press('Escape');
  await nav('overview');
  await page.locator('[data-select-session]').first().check();
  await shot('polish-history-mobile');
  await page.setViewportSize({width:1440,height:1000});
  await shot('polish-history-desktop');
  await page.locator('[data-load-more-history]').click();
  if(await page.locator('.session-card').count()!==31) throw new Error('Pagination failed');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.session-open').first().click();
  await shot('polish-history-detail-mobile');
  await page.keyboard.press('Escape');
  await page.locator('.card-delete').first().click();
  await shot('polish-history-delete-mobile');
  await page.keyboard.press('Escape');
  await page.locator('.card-edit').first().click();
  await shot('polish-history-edit-mobile');
}
