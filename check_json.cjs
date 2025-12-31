const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('Valid JSON. Version:', data.version);
} catch (e) {
  console.error('Invalid JSON:', e);
}
