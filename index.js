const os = require('os');
const path = require('path');
const fs = require('fs');
const HubSync = require('./sync');

try {
  const token = fs.readFileSync(path.join(os.homedir(), '.hub-sync'), 'utf-8').trim();
  const hs = new HubSync({ token });
} catch (e) {
  console.error(e);
  console.error('Tips: make sure ~/.hub-sync exists.');
}
