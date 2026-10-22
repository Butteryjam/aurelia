const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock } = require('./qa-runner');

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  // Set to Dark theme via Settings
  console.log('1. Setting Dark Theme...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://settings" app.aurelia.culinary');
  await sleep(2000);
  runAdb('shell input tap 500 1050'); // Tap Dark
  await sleep(1500);

  // Return to root tabs
  // Pop any stacks
  runAdb('shell input keyevent 4');
  await sleep(1000);
  runAdb('shell input keyevent 4');
  await sleep(1000);

  // 1. RECIPES TAB (DARK)
  console.log('2. Recipes Tab (Dark)...');
  runAdb('shell input tap 324 2260'); // Tap Recipes tab
  await sleep(3000);
  await captureScreenAndLog('screen_02_recipes_dark');

  // 2. CREATE RECIPE (DARK)
  console.log('3. Create Recipe (Dark)...');
  // Plus button is at top right of Recipes screen (around 980 160)
  runAdb('shell input tap 980 160');
  await sleep(3000);
  await captureScreenAndLog('screen_04_create_recipe_dark');

  // Pop back from Create Recipe
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // 3. MORE TAB (DARK)
  console.log('4. More Tab (Dark)...');
  runAdb('shell input tap 972 2260'); // Tap More tab
  await sleep(2500);
  await captureScreenAndLog('screen_17_more_dark');

  // 4. RETURN TO SETTINGS AND SET TO SYSTEM
  console.log('5. Setting to System Theme...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://settings" app.aurelia.culinary');
  await sleep(2000);
  runAdb('shell input tap 840 1050'); // Tap System button
  await sleep(1500);
  await captureScreenAndLog('screen_15_settings_system');

  console.log('Done!');
}

run().catch(console.error);
