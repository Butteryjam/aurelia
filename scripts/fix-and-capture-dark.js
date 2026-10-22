const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock } = require('./qa-runner');

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  // 1. Dismiss any open dialog
  console.log('1. Dismissing dialog if open...');
  runAdb('shell input tap 430 1330'); // Tap CANCEL
  await sleep(1000);
  runAdb('shell input keyevent 4'); // Back out of shopping
  await sleep(1000);
  runAdb('shell input keyevent 4'); // Back out to tabs
  await sleep(1000);

  // 2. Set to Dark Theme via settings
  console.log('2. Setting Dark Theme...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://settings" app.aurelia.culinary');
  await sleep(2500);
  runAdb('shell input tap 500 1050'); // Tap Dark
  await sleep(1500);

  // 3. Go back to Tabs
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // 4. Tap RECIPES tab (x: 324, y: 2260)
  console.log('4. Navigating to Recipes Tab (Dark)...');
  runAdb('shell input tap 324 2260');
  await sleep(3000);
  await captureScreenAndLog('screen_02_recipes_dark');

  // 5. Open Create Recipe (tap "+" button at top right: around 980 160 on Recipes screen)
  console.log('5. Navigating to Create Recipe (Dark)...');
  runAdb('shell input tap 980 160');
  await sleep(3500);
  await captureScreenAndLog('screen_04_create_recipe_dark');

  // Go back from Create Recipe
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // 6. Tap MORE tab (x: 972, y: 2260)
  console.log('6. Navigating to More Tab (Dark)...');
  runAdb('shell input tap 972 2260');
  await sleep(2500);
  await captureScreenAndLog('screen_17_more_dark');

  // 7. Reset theme to Light/System
  console.log('7. Switching theme back in Settings...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://settings" app.aurelia.culinary');
  await sleep(2500);
  runAdb('shell input tap 220 1050'); // Tap Light
  await sleep(1500);
  await captureScreenAndLog('screen_15_settings_reverted_light');

  console.log('Done!');
}

run().catch(console.error);
