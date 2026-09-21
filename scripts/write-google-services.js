// EAS pre-install hook: google-services.json is gitignored, so it isn't in the
// build's project copy. Recreate it from the GOOGLE_SERVICES_JSON_B64 EAS
// secret (base64 of the file) so app.config.ts finds it. No-op when unset
// (local dev already has the real file).
const { writeFileSync, existsSync } = require('node:fs');

const b64 = process.env.GOOGLE_SERVICES_JSON_B64;
if (b64 && !existsSync('./google-services.json')) {
  writeFileSync('./google-services.json', Buffer.from(b64, 'base64'));
  console.log('write-google-services: wrote google-services.json from EAS secret');
}
