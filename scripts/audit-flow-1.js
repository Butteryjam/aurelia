const { wakeAndUnlock, captureScreenAndLog, sleep, tapElement, runAdb, tapCenter, findElement } = require('./qa-runner');

async function auditFlow1() {
  wakeAndUnlock();
  await sleep(1000);

  // 1. Recipes Tab
  console.log('--- SCREEN 2: RECIPES TAB ---');
  runAdb('shell input tap 324 2260'); // Tap Recipes tab
  await sleep(2000);
  await captureScreenAndLog('screen_02_recipes_light');

  // 2. Recipe Detail
  console.log('--- SCREEN 3: RECIPE DETAIL ---');
  // Tap on a recipe card
  runAdb('shell input tap 540 800');
  await sleep(2500);
  await captureScreenAndLog('screen_03_recipe_detail_light');

  // 3. AI Modification Modal
  console.log('--- SCREEN 11: AI MODIFICATION MODAL ---');
  // Check if AI Modify button exists, or find it
  let el = findElement('Modify', 'screen_03_recipe_detail_light') || findElement('AI', 'screen_03_recipe_detail_light');
  if (el) {
    tapCenter(el.bounds);
  } else {
    // Try tapping action row icon / button
    console.log('Searching for AI modification button...');
  }
  await sleep(2000);
  await captureScreenAndLog('screen_11_ai_mod_light');
  
  // Close modal if open
  runAdb('shell input keyevent 4'); // Back
  await sleep(1000);

  // 4. Cook Mode
  console.log('--- SCREEN 14: COOK MODE ---');
  // Start Cook Mode button is floating CTA or button on Recipe Detail
  el = findElement('Start Cooking', 'screen_03_recipe_detail_light') || findElement('Cook Mode', 'screen_03_recipe_detail_light') || findElement('Cook', 'screen_03_recipe_detail_light');
  if (el) {
    tapCenter(el.bounds);
  } else {
    // Floating CTA is typically near bottom right: [700, 2100][980, 2200]
    runAdb('shell input tap 850 2150');
  }
  await sleep(2500);
  await captureScreenAndLog('screen_14_cook_mode_light');

  // Exit Cook Mode
  runAdb('shell input keyevent 4'); // Back
  await sleep(1000);
  // If exit confirmation dialog appears, tap Exit
  const exitBtn = findElement('Exit', 'temp');
  if (exitBtn) {
    tapCenter(exitBtn.bounds);
    await sleep(1000);
  }

  // 5. Edit Recipe
  console.log('--- SCREEN 5: EDIT RECIPE ---');
  // Tap edit button in Recipe Detail header (top right)
  runAdb('shell input tap 970 140');
  await sleep(2500);
  await captureScreenAndLog('screen_05_edit_recipe_light');

  // Go back to Recipe Detail then back to Recipes
  runAdb('shell input keyevent 4'); // Back
  await sleep(1000);
  runAdb('shell input keyevent 4'); // Back to Recipes
  await sleep(1000);
}

auditFlow1().catch(console.error);
