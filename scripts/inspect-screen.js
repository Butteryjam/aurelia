const { wakeAndUnlock, captureScreenAndLog, sleep } = require('./qa-runner');

async function main() {
  wakeAndUnlock();
  await sleep(1500);
  await captureScreenAndLog('screen_001_launch');
}

main().catch(console.error);
