const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock } = require('./qa-runner');

async function test() {
  wakeAndUnlock();
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://collections" app.aurelia.culinary');
  await sleep(2500);
  console.log('Tapping collection card at 540 800...');
  runAdb('shell input tap 540 800');
  await sleep(3000);
  await captureScreenAndLog('screen_08_collection_detail_light');
}

test().catch(console.error);
