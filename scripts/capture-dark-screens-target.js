const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock, tapElement } = require('./qa-runner');

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  // 1. RECIPES TAB (DARK)
  console.log('\n>>> 1. RECIPES TAB (DARK)');
  runAdb('shell input tap 324 2260'); // Tap Recipes tab
  await sleep(3000);
  await captureScreenAndLog('screen_02_recipes_dark');

  // 2. RECIPE DETAIL (DARK)
  console.log('\n>>> 2. RECIPE DETAIL (DARK)');
  // Tap first recipe card (Chicken Garlic Pasta)
  runAdb('shell input tap 540 1200');
  await sleep(3500);
  await captureScreenAndLog('screen_03_recipe_detail_dark');

  // 3. COOK MODE (DARK)
  console.log('\n>>> 3. COOK MODE (DARK)');
  // Start Cook Mode button at bottom: bounds [407, 2195][744, 2250]
  runAdb('shell input tap 540 2210');
  await sleep(3500);
  await captureScreenAndLog('screen_14_cook_mode_dark');

  // Exit cook mode back to recipe detail
  runAdb('shell input keyevent 4');
  await sleep(1500);
  // Exit recipe detail back to recipes
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // 4. CREATE RECIPE (DARK)
  console.log('\n>>> 4. CREATE RECIPE (DARK)');
  // Tap "+" at top right of Recipes screen (around 980, 160)
  runAdb('shell input tap 980 160');
  await sleep(3000);
  await captureScreenAndLog('screen_04_create_recipe_dark');

  // Exit create recipe
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // 5. MORE TAB (DARK)
  console.log('\n>>> 5. MORE TAB (DARK)');
  runAdb('shell input tap 972 2260'); // Tap More tab
  await sleep(2500);
  await captureScreenAndLog('screen_17_more_dark');

  // 6. SWITCH BACK TO SYSTEM / LIGHT IN SETTINGS
  console.log('\n>>> 6. SWITCHING THEME IN SETTINGS');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://settings" app.aurelia.culinary');
  await sleep(2500);
  // Tap Light theme button [220, 1050]
  runAdb('shell input tap 220 1050');
  await sleep(1500);
  await captureScreenAndLog('screen_15_settings_reverted_light');

  console.log('>>> Targeted Dark & Theme Toggle QA Completed!');
}

run().catch(console.error);
