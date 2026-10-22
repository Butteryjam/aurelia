const { runAdb, captureScreenshot, dumpHierarchy, tapCenter, typeText, pressKey, ARTIFACT_DIR } = require('./adb-helper');
const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function wakeAndUnlock() {
  runAdb('shell input keyevent 224'); // WAKEUP
  runAdb('shell input keyevent 82');  // MENU / UNLOCK
}

function getElements(dumpName) {
  const nodes = dumpHierarchy(dumpName);
  return nodes.filter(n => (n.text && n.text.trim()) || (n['content-desc'] && n['content-desc'].trim()));
}

function findElement(term, dumpName) {
  const t = term.toLowerCase();
  const nodes = dumpHierarchy(dumpName || 'temp_dump');
  return nodes.find(n => 
    (n.text && n.text.toLowerCase().includes(t)) || 
    (n['content-desc'] && n['content-desc'].toLowerCase().includes(t))
  );
}

function tapElement(term, dumpName) {
  const el = findElement(term, dumpName);
  if (!el) {
    console.error(`Element matching "${term}" not found!`);
    return false;
  }
  console.log(`Tapping "${term}" at bounds ${el.bounds} (text: "${el.text}", desc: "${el['content-desc']}")`);
  tapCenter(el.bounds);
  return true;
}

function scrollDown() {
  runAdb('shell input swipe 540 1600 540 600 300');
}

function scrollUp() {
  runAdb('shell input swipe 540 600 540 1600 300');
}

async function captureScreenAndLog(name) {
  const screenshotPath = captureScreenshot(name);
  const elements = getElements(name);
  console.log(`\n=== SCREENSHOT CAPTURED: ${name} ===`);
  console.log(`Path: ${screenshotPath}`);
  console.log(`Elements (${elements.length}):`);
  elements.forEach(el => {
    console.log(`  - [${el.class}] text: "${el.text || ''}" | desc: "${el['content-desc'] || ''}" | bounds: ${el.bounds}`);
  });
  return { screenshotPath, elements };
}

module.exports = {
  sleep,
  wakeAndUnlock,
  getElements,
  findElement,
  tapElement,
  scrollDown,
  scrollUp,
  captureScreenAndLog,
  runAdb,
  captureScreenshot,
  dumpHierarchy,
  tapCenter,
  typeText,
  pressKey,
  ARTIFACT_DIR
};
