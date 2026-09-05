async page => {
  await page.emulateMedia({reducedMotion:'reduce'});
  async function nav(view) {
    await page.locator('#open-menu').click();
    await page.locator('#side-menu [data-view='+view+']').click();
    await page.waitForFunction(v=>document.querySelector('#'+v+'-view').classList.contains('active'),view);
  }
  await page.setViewportSize({width:390,height:844});
  await nav('overview');
  await page.locator('[data-history-date]').first().click();
  if(!await page.locator('.history-date-active').count()) throw new Error('Date navigation lost selection');
  await page.locator('[data-select-session]').first().check();
  await page.locator('.card-copy').first().click();
  await page.locator('#cancel-session-edit').click();
  await nav('overview');
  await page.locator('[data-select-session]').first().check();
  await page.locator('.card-edit').first().click();
  await page.locator('#cancel-session-edit').click();
  await nav('overview');
  await page.locator('[data-select-session]').first().check();
  await page.locator('.card-delete').first().click();
  await page.locator('#confirm-delete-accept').click();
  const live = await page.evaluate(()=>JSON.parse(localStorage.getItem('trainingSessions')).filter(x=>!x.deletedAt).length);
  if(live!==30) throw new Error('Delete did not preserve the other sessions: '+live);
  await page.evaluate(()=>localStorage.setItem('trainingSessions','[]'));
  await page.reload();
  await page.waitForFunction(()=>document.body.classList.contains('app-ready'));
  await page.addStyleTag({url:'/e2e/fixtures/no-animations.css'});
  await page.locator('.history-empty .primary-button').focus();
  await page.screenshot({path:'output/playwright/final-empty-history-mobile.png',animations:'disabled'});
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#log-view').classList.contains('active'));
  await nav('plan');
}
