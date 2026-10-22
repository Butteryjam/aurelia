const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock, dumpHierarchy, tapCenter } = require('./qa-runner');

async function waitForCondition(desc, conditionFn, timeoutMs = 12000, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await conditionFn()) {
      console.log(`Condition met: ${desc}`);
      return true;
    }
    await sleep(intervalMs);
  }
  console.log(`Condition timed out: ${desc}`);
  return false;
}

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  // 1. COLLECTIONS
  console.log('\n>>> Navigating to Collections...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://collections" app.aurelia.culinary');
  
  // Wait until loading indicator is gone
  await waitForCondition('Collections loaded', () => {
    const nodes = dumpHierarchy('check_collections');
    const loading = nodes.find(n => n.text && n.text.includes('Curating your binders'));
    return !loading;
  }, 10000, 1000);

  await sleep(1500);
  const collDump = await captureScreenAndLog('screen_07_collections_light');

  // Let's inspect collections elements
  const collectionNodes = dumpHierarchy('screen_07_collections_light');
  console.log('Collections screen text elements:');
  collectionNodes.filter(n => n.text).forEach(n => console.log(`  - "${n.text}" (${n.bounds})`));

  // Check if there is an existing collection card to tap, or if empty state
  const firstCard = collectionNodes.find(n => n.text && !n.text.includes('Collections') && !n.text.includes('Thematic binders') && n.text.length > 2);
  
  if (firstCard) {
    console.log(`Found collection card "${firstCard.text}", tapping to open Collection Detail...`);
    tapCenter(firstCard.bounds);
  } else {
    console.log('No collections found or empty state. Let\'s see if there is a create (+) button at top right...');
    const plusBtn = collectionNodes.find(n => n.class === 'android.widget.Button' || n.text === '+' || (n.bounds && n.bounds.includes('[850,') || n.bounds.includes('[900,')));
    console.log('Plus button candidate:', plusBtn);
    // Top right (+) is usually at bounds [882, 108][1014, 240] in header
    runAdb('shell input tap 948 174');
    await sleep(2000);
    // Capture create modal if opened
    await captureScreenAndLog('screen_07b_collection_create_modal_light');
    // Type collection title
    runAdb('shell input text "Italian%sFamily%sTable"');
    await sleep(1000);
    // Tap Create button
    const modalNodes = dumpHierarchy('check_modal');
    const createBtn = modalNodes.find(n => n.text && n.text.toLowerCase().includes('create'));
    if (createBtn) {
      tapCenter(createBtn.bounds);
      await sleep(3000);
    }
  }

  await sleep(2500);
  await captureScreenAndLog('screen_08_collection_detail_light');

  // 2. MEAL PLANNER
  console.log('\n>>> Navigating to Meal Planner...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://planner" app.aurelia.culinary');
  
  await waitForCondition('Planner loaded', () => {
    const nodes = dumpHierarchy('check_planner');
    const loading = nodes.find(n => n.text && n.text.includes('Loading meal plan'));
    return !loading;
  }, 10000, 1000);

  await sleep(2000);
  await captureScreenAndLog('screen_12_planner_light');

  console.log('>>> Collections & Planner Light QA complete!');
}

run().catch(console.error);
