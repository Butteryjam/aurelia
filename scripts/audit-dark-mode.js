const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock, tapElement, tapCenter, dumpHierarchy } = require('./qa-runner');

async function runDarkModeAudit() {
  wakeAndUnlock();
  await sleep(1000);

  // 1. OPEN SETTINGS & SWITCH TO DARK MODE
  console.log('\n>>> 1. NAVIGATING TO SETTINGS & SWITCHING TO DARK MODE');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://settings" app.aurelia.culinary');
  await sleep(2500);

  console.log('Tapping Dark theme option...');
  const tappedDark = tapElement('Dark', 'settings_screen');
  if (!tappedDark) {
    // Fallback tap on Dark theme button: [500, 1050]
    runAdb('shell input tap 500 1050');
  }
  await sleep(2000);
  await captureScreenAndLog('screen_15_settings_dark');

  // 2. HOME SCREEN (DARK)
  console.log('\n>>> 2. HOME SCREEN (DARK)');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://(app)/(tabs)/home" app.aurelia.culinary');
  await sleep(2500);
  await captureScreenAndLog('screen_01_home_dark');

  // 3. RECIPES TAB (DARK)
  console.log('\n>>> 3. RECIPES TAB (DARK)');
  runAdb('shell input tap 324 2260');
  await sleep(2500);
  await captureScreenAndLog('screen_02_recipes_dark');

  // 4. RECIPE DETAIL (DARK)
  console.log('\n>>> 4. RECIPE DETAIL (DARK)');
  runAdb('shell input tap 540 1200');
  await sleep(3000);
  await captureScreenAndLog('screen_03_recipe_detail_dark');

  // 5. COOK MODE (DARK)
  console.log('\n>>> 5. COOK MODE (DARK)');
  // Floating "Start Cook Mode" button is at bounds [407, 2195][744, 2250]
  console.log('Tapping Start Cook Mode button at (540, 2210)...');
  runAdb('shell input tap 540 2210');
  await sleep(3000);
  await captureScreenAndLog('screen_14_cook_mode_dark');

  // Exit cook mode back to detail
  runAdb('shell input keyevent 4');
  await sleep(1500);
  // Exit recipe detail
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // 6. MEAL PLANNER (DARK)
  console.log('\n>>> 6. MEAL PLANNER (DARK)');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://planner" app.aurelia.culinary');
  await sleep(3000);
  await captureScreenAndLog('screen_12_planner_dark');

  // 7. AI CHEF (DARK)
  console.log('\n>>> 7. AI CHEF (DARK)');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://chef" app.aurelia.culinary');
  await sleep(2500);
  await captureScreenAndLog('screen_10_ai_chef_dark');

  // 8. SHOPPING (DARK)
  console.log('\n>>> 8. SHOPPING (DARK)');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://shopping" app.aurelia.culinary');
  await sleep(3000);
  await captureScreenAndLog('screen_13_shopping_dark');

  // 9. COLLECTIONS (DARK)
  console.log('\n>>> 9. COLLECTIONS (DARK)');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://collections" app.aurelia.culinary');
  await sleep(3000);
  await captureScreenAndLog('screen_07_collections_dark');

  // 10. FAVORITES (DARK)
  console.log('\n>>> 10. FAVORITES (DARK)');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://favorites" app.aurelia.culinary');
  await sleep(2500);
  await captureScreenAndLog('screen_06_favorites_dark');

  // 11. MORE TAB (DARK)
  console.log('\n>>> 11. MORE TAB (DARK)');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://(app)/(tabs)/more" app.aurelia.culinary');
  await sleep(2000);
  await captureScreenAndLog('screen_17_more_dark');

  console.log('\n>>> Dark Mode Visual Audit Completed Successfully!');
}

runDarkModeAudit().catch(console.error);
