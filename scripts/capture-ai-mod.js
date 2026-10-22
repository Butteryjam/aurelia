const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock } = require('./qa-runner');

async function run() {
  wakeAndUnlock();
  await sleep(1000);

  console.log('1. Opening Recipe Detail...');
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://recipes" app.aurelia.culinary');
  await sleep(3000);
  runAdb('shell input tap 540 1200'); // Tap Chicken Garlic Pasta
  await sleep(3000);

  console.log('2. Scrolling down to AI Modify Recipe button...');
  runAdb('shell input swipe 540 1800 540 700 300');
  await sleep(1000);
  runAdb('shell input swipe 540 1800 540 700 300');
  await sleep(1000);

  console.log('3. Tapping AI Modify Recipe at (540, 1920)...');
  runAdb('shell input tap 540 1920');
  await sleep(2500);
  await captureScreenAndLog('screen_11_ai_modification_light');

  console.log('4. Dismissing modal...');
  runAdb('shell input keyevent 4');
  await sleep(1500);
}

run().catch(console.error);
