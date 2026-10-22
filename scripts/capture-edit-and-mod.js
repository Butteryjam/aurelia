const { runAdb, captureScreenAndLog, sleep, tapElement, findElement, tapCenter } = require('./qa-runner');

async function testEditAndMod() {
  console.log('1. Deep linking to recipes...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://recipes" app.aurelia.culinary');
  await sleep(3000);

  console.log('2. Tapping on first recipe...');
  // Tap first recipe card (around 540, 750)
  runAdb('shell input tap 540 750');
  await sleep(3000);
  const detail = await captureScreenAndLog('screen_03_recipe_detail_light');

  console.log('3. Tapping Edit Pencil button at (785, 75)...');
  runAdb('shell input tap 785 75');
  await sleep(3000);
  await captureScreenAndLog('screen_05_edit_recipe_light');

  console.log('4. Scrolling down in Edit Recipe...');
  runAdb('shell input swipe 540 1800 540 600 300');
  await sleep(1500);
  await captureScreenAndLog('screen_05b_edit_recipe_scrolled_light');

  console.log('5. Pressing Back to return to Recipe Detail...');
  runAdb('shell input keyevent 4');
  await sleep(2000);

  console.log('6. Opening AI Modification modal...');
  // Scroll down in Recipe Detail to find "AI Modify Recipe"
  runAdb('shell input swipe 540 1800 540 800 300');
  await sleep(1500);
  // Tap "AI Modify Recipe"
  const modEl = findElement('AI Modify Recipe', 'temp') || findElement('Modify', 'temp');
  if (modEl) {
    tapCenter(modEl.bounds);
  } else {
    // Tap bounds around [540, 1550]
    runAdb('shell input tap 540 1550');
  }
  await sleep(2500);
  await captureScreenAndLog('screen_11_ai_modification_light');

  console.log('7. Dismissing AI Modification modal...');
  runAdb('shell input keyevent 4');
  await sleep(1500);
}

testEditAndMod().catch(console.error);
