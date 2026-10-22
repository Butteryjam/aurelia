const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock } = require('./qa-runner');

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  // --- 6. FAVORITES ---
  console.log('\n>>> 6. FAVORITES');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://favorites" app.aurelia.culinary');
  await sleep(3500);
  await captureScreenAndLog('screen_06_favorites_light');

  // --- 7. COLLECTIONS ---
  console.log('\n>>> 7. COLLECTIONS');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://collections" app.aurelia.culinary');
  await sleep(3500);
  await captureScreenAndLog('screen_07_collections_light');

  // --- 8. COLLECTION DETAIL ---
  console.log('\n>>> 8. COLLECTION DETAIL');
  // Tap first collection card (around 540, 600)
  runAdb('shell input tap 540 600');
  await sleep(3000);
  await captureScreenAndLog('screen_08_collection_detail_light');

  // --- 9. AI IMPORT ---
  console.log('\n>>> 9. AI IMPORT');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://recipe/import" app.aurelia.culinary');
  await sleep(3500);
  await captureScreenAndLog('screen_09_ai_import_light');

  // --- 10. AI CHEF ---
  console.log('\n>>> 10. AI CHEF');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://chef" app.aurelia.culinary');
  await sleep(3500);
  await captureScreenAndLog('screen_10_ai_chef_light');

  // --- 12. MEAL PLANNER ---
  console.log('\n>>> 12. MEAL PLANNER');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://planner" app.aurelia.culinary');
  await sleep(3500);
  await captureScreenAndLog('screen_12_planner_light');

  // --- 13. SHOPPING ---
  console.log('\n>>> 13. SHOPPING');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://shopping" app.aurelia.culinary');
  await sleep(3500);
  await captureScreenAndLog('screen_13_shopping_light');

  console.log('>>> Remaining Light audit flow complete!');
}

run().catch(console.error);
