const { wakeAndUnlock, captureScreenAndLog, sleep, tapElement, findElement, tapCenter, runAdb } = require('./qa-runner');

async function testThemeSwitch() {
  wakeAndUnlock();
  await sleep(1000);

  console.log('1. Tapping More tab...');
  // Tap More tab (around bounds [937,2246][1007,2285])
  runAdb('shell input tap 970 2260');
  await sleep(2000);
  await captureScreenAndLog('qa_01_more_tab');

  console.log('2. Tapping Settings row...');
  // In More tab, tap Settings
  const tappedSettings = tapElement('Settings', 'qa_01_more_tab');
  if (!tappedSettings) {
    // try fallback tap around [540, 1000]
    runAdb('shell input tap 540 850');
  }
  await sleep(2000);
  await captureScreenAndLog('qa_02_settings_screen');

  console.log('3. Selecting Light Theme...');
  // In Settings screen, find "Light" theme button
  const tappedLight = tapElement('Light', 'qa_02_settings_screen');
  if (!tappedLight) {
    console.log('Could not find Light text, checking bounds...');
  }
  await sleep(2000);
  await captureScreenAndLog('qa_03_settings_light');

  console.log('4. Navigating back to More in Light theme...');
  runAdb('shell input keyevent 4'); // Back
  await sleep(1500);
  await captureScreenAndLog('qa_04_more_light');

  console.log('5. Navigating to Home tab in Light theme...');
  runAdb('shell input tap 108 2260'); // Home tab
  await sleep(1500);
  await captureScreenAndLog('qa_05_home_light');
}

testThemeSwitch().catch(console.error);
