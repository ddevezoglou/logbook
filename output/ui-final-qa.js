async page => {
  await page.reload();
  await page.waitForFunction(()=>document.body.classList.contains('app-ready'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addStyleTag({url:'/e2e/fixtures/no-animations.css'});
  async function nav(view) {
    await page.locator('#open-menu').click();
    await page.locator('#side-menu [data-view='+view+']').click();
    await page.waitForFunction(v=>document.querySelector('#'+v+'-view').classList.contains('active'),view);
  }
  await nav('overview');
  await page.locator('[data-select-session]').first().check();
  for (const language of ['el','en','fr','de']) {
    await page.evaluate(l=>window.LogbookI18n.setLanguage(l),language);
    await page.locator('[data-select-session]').first().check();
    for (const width of [320,390,1440]) {
      await page.setViewportSize({width,height:900});
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Overflow: '+language+' / '+width);
      const clipped = await page.locator('.card-selection-actions').first().evaluate(el=>[...el.children].some(b=>b.scrollWidth>b.clientWidth || b.scrollHeight>b.clientHeight));
      if(clipped) throw new Error('Clipped history controls: '+language+' / '+width);
    }
  }
  await page.evaluate(()=>window.LogbookI18n.setLanguage('el'));
  await page.locator('[data-select-session]').first().check();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.session-card').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/playwright/final-history-mobile.png',animations:'disabled'});
  await page.evaluate(()=>document.documentElement.dataset.theme='night');
  await page.screenshot({path:'output/playwright/final-history-night.png',animations:'disabled'});
  await page.locator('.card-delete').first().click();
  await page.screenshot({path:'output/playwright/final-delete-night.png',animations:'disabled'});
  await page.keyboard.press('Escape');
  await nav('plan');
  await page.screenshot({path:'output/playwright/final-plan-night.png',fullPage:true,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.dataset.theme='day');
  await page.screenshot({path:'output/playwright/final-plan-mobile.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'output/playwright/final-plan-desktop.png',fullPage:true,animations:'disabled'});
}
