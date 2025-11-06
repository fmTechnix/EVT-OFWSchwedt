const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'fmTechnix/EVT';
const TAG = 'v1.0.0';
const ZIP_FILE = '/home/runner/workspace/public/evt-projekt.zip';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function createRelease() {
  console.log('Creating GitHub Release...');
  
  const releaseData = JSON.stringify({
    tag_name: TAG,
    name: 'EVT v1.0.0 - Feuerwehr-Einsatzverwaltungstool',
    body: `## EVT - Feuerwehr-Einsatzverwaltungstool

### Features
- Einsatzplanung mit automatischer Crew-Zuteilung
- 14 Qualifikationen, 9 Fahrzeugtypen
- Push-Benachrichtigungen (PWA)
- AAO-System (Alarm- und Ausrückeordnung)
- DE-Alarm Integration
- Fairness/Rotation-System
- Verfügbarkeitsvorlagen
- Mängelmeldungen
- Kalender mit RSVP

### Installation
1. ZIP herunterladen und entpacken
2. \`npm install\` ausführen
3. \`.env\` Datei erstellen (siehe .env.example)
4. \`npm run dev\` zum Starten

Siehe DEPLOYMENT.md für Raspberry Pi Installation.

### Technologie
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Express.js + PostgreSQL
- PWA mit Service Worker
- Push Notifications (Web Push API)`,
    draft: false,
    prerelease: false
  });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO}/releases`,
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'User-Agent': 'Node.js',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(releaseData)
    }
  };

  try {
    const release = await makeRequest(options, releaseData);
    console.log(`✅ Release created: ${release.html_url}`);
    return release;
  } catch (error) {
    console.error('Error creating release:', error.message);
    throw error;
  }
}

async function uploadAsset(release) {
  console.log('Uploading ZIP file...');
  
  const uploadUrl = release.upload_url.replace('{?name,label}', '');
  const fileName = 'evt-projekt.zip';
  const fileData = fs.readFileSync(ZIP_FILE);
  
  const url = new URL(`${uploadUrl}?name=${fileName}&label=EVT%20Full%20Project`);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'User-Agent': 'Node.js',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/zip',
      'Content-Length': fileData.length
    }
  };

  try {
    const asset = await makeRequest(options, fileData);
    console.log(`✅ ZIP uploaded successfully!`);
    console.log(`Download URL: ${asset.browser_download_url}`);
    return asset;
  } catch (error) {
    console.error('Error uploading asset:', error.message);
    throw error;
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('ERROR: GITHUB_TOKEN not found');
    process.exit(1);
  }

  if (!fs.existsSync(ZIP_FILE)) {
    console.error(`ERROR: ZIP file not found: ${ZIP_FILE}`);
    process.exit(1);
  }

  try {
    const release = await createRelease();
    await uploadAsset(release);
    console.log('\n🎉 Successfully uploaded to GitHub!');
    console.log(`Repository: https://github.com/${REPO}`);
    console.log(`Release: https://github.com/${REPO}/releases/tag/${TAG}`);
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  }
}

main();
