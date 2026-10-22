const { runAdb, captureScreenAndLog, sleep } = require('./qa-runner');

async function run() {
  console.log('1. Tapping Edit pencil button at (785, 140)...');
  runAdb('shell input tap 785 140');
  await sleep(3000);
  await captureScreenAndLog('screen_05_edit_recipe_light');

  console.log('2. Returning from Edit Recipe...');
  runAdb('shell input keyevent 4');
  await sleep(2000);

  console.log('3. Scrolling down to AI Modify Recipe...');
  runAdb('shell input swipe 540 1800 540 800 300');
  await sleep(1500);
  runAdb('shell input swipe 540 1800 540 800 300');
  await sleep(1500);
  await captureScreenAndLog('recipe_detail_bottom');

  console.log('4. Tapping AI Modify Recipe button...');
  // Check bounds in recipe_detail_bottom or tap around (540, 1650)
  runAdb('shell input tap 540 1650');
  await sleep(2500);
  await captureScreenAndLog('screen_11_ai_modification_light');

  console.log('5. Closing AI Modification Modal...');
  runAdb('shell input keyevent 4');
  await sleep(1500);

  console.log('6. Tapping Start Cook Mode at (540, 2210)...');
  runAdb('shell input tap 540 2210');
  await sleep(3000);
  await captureScreenAndLog('screen_14_cook_mode_light');
}

run().catch(console.error);
