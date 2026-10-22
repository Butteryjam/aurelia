const { runAdb, tapCenter, typeText, captureScreenshot, dumpHierarchy } = require('./adb-helper');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Testing Prev button on Step 1...');
  tapCenter('[221,2192][317,2250]');
  await sleep(600);
  
  console.log('Rapidly tapping Next Step...');
  for (let i = 0; i < 6; i++) {
    // Center of Next Step button ~ 700, 2220
    runAdb('shell input tap 700 2220');
    await sleep(400);
  }
  
  await sleep(1000);
  captureScreenshot('screen_022_cook_step6_or_finish');
  const nodes = dumpHierarchy('dump_022_cook_step6_or_finish');
  console.log('Nodes on screen:', nodes.filter(n => n.text).map(n => n.text));
}

run();
