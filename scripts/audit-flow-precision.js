const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock } = require('./qa-runner');

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  console.log('--- 1. Opening Recipes tab ---');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://recipes" app.aurelia.culinary');
  await sleep(3500);

  console.log('--- 2. Tapping first recipe card at (540, 1200) ---');
  runAdb('shell input tap 540 1200');
  await sleep(3000);
  await captureScreenAndLog('qa_recipe_detail_ready');

  console.log('--- 3. Tapping Edit Pencil at (785, 140) ---');
  runAdb('shell input tap 785 140');
  await sleep(3000);
  await captureScreenAndLog('screen_05_edit_recipe_light');

  console.log('--- 4. Scrolling down in Edit Recipe ---');
  runAdb('shell input swipe 540 1600 540 700 300');
  await sleep(1500);
  await captureScreenAndLog('screen_05b_edit_recipe_scrolled_light');

  console.log('--- 5. Returning to Recipe Detail ---');
  runAdb('shell input keyevent 4');
  await sleep(2000);

  console.log('--- 6. Tapping Start Cook Mode at (540, 2210) ---');
  runAdb('shell input tap 540 2210');
  await sleep(3000);
  await captureScreenAndLog('screen_14_cook_mode_light');

  console.log('--- 7. Returning from Cook Mode ---');
  runAdb('shell input keyevent 4');
  await sleep(2000);

  console.log('--- 8. Scrolling down in Recipe Detail to AI Modify Recipe ---');
  runAdb('shell input swipe 540 1800 540 700 300');
  await sleep(1000);
  runAdb('shell input swipe 540 1800 540 700 300');
  await sleep(1000);
  await captureScreenAndLog('qa_recipe_detail_bottom_ready');

  console.log('--- 9. Tapping AI Modify Recipe ---');
  // AI Modify Recipe button is above Ask AI Chef, around (540, 1550) or (540, 1650)
  runAdb('shell input tap 540 1650');
  await sleep(2500);
  await captureScreenAndLog('screen_11_ai_modification_light');

  console.log('--- 10. Closing AI Modification Modal ---');
  runAdb('shell input keyevent 4');
  await sleep(1500);

  console.log('--- 11. Returning to Recipes Tab ---');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://recipes" app.aurelia.culinary');
  await sleep(2000);
  console.log('Done!');
}

run().catch(console.error);
