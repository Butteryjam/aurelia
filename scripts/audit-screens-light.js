const { wakeAndUnlock, captureScreenAndLog, sleep, runAdb, tapCenter, findElement } = require('./qa-runner');

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  // --- SCREEN 2: RECIPES TAB ---
  console.log('\n>>> 2. RECIPES TAB');
  runAdb('shell input tap 324 2260'); // Tap Recipes tab
  await sleep(3000); // Give ample time for recipes list to load
  await captureScreenAndLog('audit_02_recipes_light');

  // --- SCREEN 3: RECIPE DETAIL ---
  console.log('\n>>> 3. RECIPE DETAIL');
  // Tap first recipe card (Chicken Garlic Pasta)
  runAdb('shell input tap 540 1200');
  await sleep(3000);
  await captureScreenAndLog('audit_03_recipe_detail_light');

  // --- SCREEN 11: AI MODIFICATION MODAL ---
  console.log('\n>>> 11. AI MODIFICATION MODAL');
  // Scroll down to reveal AI Modify Recipe button
  runAdb('shell input swipe 540 1800 540 1000 300');
  await sleep(1500);
  const modEl = findElement('Modify', 'temp');
  if (modEl) {
    tapCenter(modEl.bounds);
  } else {
    // Tap where AI Modify Recipe button is located around [540, 1850]
    runAdb('shell input tap 540 1750');
  }
  await sleep(2500);
  await captureScreenAndLog('audit_11_ai_modification_light');
  // Dismiss modal
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // --- SCREEN 5: EDIT RECIPE ---
  console.log('\n>>> 5. EDIT RECIPE');
  // Scroll back to top
  runAdb('shell input swipe 540 800 540 1800 300');
  await sleep(1000);
  // Tap edit button in top right (x=785, y=75)
  runAdb('shell input tap 785 75');
  await sleep(3000);
  await captureScreenAndLog('audit_05_edit_recipe_light');
  // Scroll down in edit recipe
  runAdb('shell input swipe 540 1600 540 800 300');
  await sleep(1500);
  await captureScreenAndLog('audit_05b_edit_recipe_scrolled_light');
  // Go back to detail
  runAdb('shell input keyevent 4');
  await sleep(1500);
  // Go back to Recipes tab
  runAdb('shell input keyevent 4');
  await sleep(1500);

  // --- SCREEN 4: CREATE RECIPE ---
  console.log('\n>>> 4. CREATE RECIPE');
  // Tap "+" button at top right of Recipes tab (x=900, y=80)
  runAdb('shell input tap 900 80');
  await sleep(3000);
  await captureScreenAndLog('audit_04_create_recipe_light');
  // Scroll down in Create recipe
  runAdb('shell input swipe 540 1600 540 800 300');
  await sleep(1500);
  await captureScreenAndLog('audit_04b_create_recipe_scrolled_light');
  // Go back to Recipes
  runAdb('shell input keyevent 4');
  await sleep(1500);

  console.log('>>> Part 1 complete!');
}

run().catch(console.error);
