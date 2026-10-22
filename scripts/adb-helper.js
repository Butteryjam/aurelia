const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'C:\\platform-tools\\adb.exe';
const CONV_ID = process.env.ANTIGRAVITY_CONVERSATION_ID || '4260cc78-330d-4842-b5fb-bb8e322f1ea3';
const ARTIFACT_DIR = path.join('C:\\Users\\svish\\.gemini\\antigravity-ide\\brain', CONV_ID, 'scratch', 'qa_screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}


function runAdb(cmd) {
  try {
    return execSync(`"${ADB}" ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    return err.stdout || err.stderr || err.message;
  }
}

function captureScreenshot(name) {
  const devicePath = `/sdcard/${name}.png`;
  const localPath = path.join(ARTIFACT_DIR, `${name}.png`);
  runAdb(`shell screencap -p ${devicePath}`);
  runAdb(`pull ${devicePath} "${localPath}"`);
  return localPath;
}

function dumpHierarchy(name) {
  const devicePath = `/sdcard/${name}.xml`;
  const localPath = path.join(ARTIFACT_DIR, `${name}.xml`);
  runAdb(`shell uiautomator dump ${devicePath}`);
  runAdb(`pull ${devicePath} "${localPath}"`);
  if (!fs.existsSync(localPath)) return [];
  const content = fs.readFileSync(localPath, 'utf8');
  const nodes = [];
  const regex = /<node\s+([^>]+)\/>/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const attrStr = m[1];
    const attrs = {};
    const attrRegex = /([a-zA-Z-]+)="([^"]*)"/g;
    let am;
    while ((am = attrRegex.exec(attrStr)) !== null) {
      attrs[am[1]] = am[2];
    }
    nodes.push(attrs);
  }
  return nodes;
}

function tapCenter(boundsStr) {
  // bounds: "[x1,y1][x2,y2]"
  const m = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) throw new Error('Invalid bounds: ' + boundsStr);
  const x = Math.round((parseInt(m[1]) + parseInt(m[3])) / 2);
  const y = Math.round((parseInt(m[2]) + parseInt(m[4])) / 2);
  runAdb(`shell input tap ${x} ${y}`);
  return { x, y };
}

function typeText(text) {
  // adb shell input text handles non-spaces, or percent-encoded spaces
  // For special characters and spaces, input keyevent or broadcast or base64
  const escaped = text.replace(/ /g, '%s').replace(/&/g, '\\&').replace(/</g, '\\<').replace(/>/g, '\\>');
  runAdb(`shell input text "${escaped}"`);
}

function pressKey(keyCode) {
  runAdb(`shell input keyevent ${keyCode}`);
}

module.exports = {
  runAdb,
  captureScreenshot,
  dumpHierarchy,
  tapCenter,
  typeText,
  pressKey,
  ARTIFACT_DIR,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (cmd === 'screen') {
    const p = captureScreenshot(args[1] || 'screen');
    console.log('Saved screenshot:', p);
  } else if (cmd === 'dump') {
    const nodes = dumpHierarchy(args[1] || 'dump');
    console.log(`Extracted ${nodes.length} nodes:`);
    nodes.filter(n => n.text || n['content-desc']).forEach(n => {
      console.log(`[${n.class}] text="${n.text}" desc="${n['content-desc']}" bounds=${n.bounds}`);
    });
  } else if (cmd === 'search') {
    const term = (args[1] || '').toLowerCase();
    const nodes = dumpHierarchy(args[2] || 'dump');
    nodes.filter(n => (n.text && n.text.toLowerCase().includes(term)) || (n['content-desc'] && n['content-desc'].toLowerCase().includes(term))).forEach(n => {
      console.log(`[${n.class}] text="${n.text}" desc="${n['content-desc']}" bounds=${n.bounds}`);
    });
  } else if (cmd === 'tap') {
    tapCenter(args[1]);
  } else if (cmd === 'type') {
    typeText(args.slice(1).join(' '));
  } else if (cmd === 'key') {
    pressKey(args[1]);
  }
}
