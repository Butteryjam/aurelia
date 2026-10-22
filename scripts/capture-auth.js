const { runAdb, captureScreenAndLog, sleep, wakeAndUnlock } = require('./qa-runner');

async function test() {
  wakeAndUnlock();
  runAdb('shell am start -W -a android.intent.action.VIEW -d "aurelia://reset-password" app.aurelia.culinary');
  await sleep(2500);
  await captureScreenAndLog('screen_16_auth_light');
}

test().catch(console.error);
