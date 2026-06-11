const fs   = require('fs');
const path = require('path');

// Load .env file as fallback for local development
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    });
}

const required = ['STRIPE_WORKER_URL'];
const missing  = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('ERROR: Missing required variables:', missing.join(', '));
  process.exit(1);
}

const output = `window.ERPNEXT_CONFIG = {
  stripe_worker_url: '${process.env.STRIPE_WORKER_URL}',
};
`;

fs.writeFileSync(path.join(__dirname, 'config.js'), output);
console.log('config.js generated successfully.');
