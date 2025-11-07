const https = require('https');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'fmTechnix/EVT';
const TAG = 'v1.0.1';
const ZIP_FILE = '/home/runner/workspace/public/evt-projekt.zip';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body || '{}'));
          } catch (e) {
            resolve(body);
          }
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
  console.log('Creating GitHub Release v1.0.1...');
  
  const releaseData = JSON.stringify({
    tag_name: TAG,
    name: 'EVT v1.0.1 - Deployment Fix + WebSocket-Fehler Lösung',
    body: `## 🔧 WebSocket-Fehler behoben

Diese Version behebt den WebSocket-Fehler \`wss://localhost/v2\` beim Deployment.

### ⚠️ WICHTIG für alle Deployments:
Die App **MUSS im Produktionsmodus** laufen! Siehe \`QUICK_FIX.md\` für die Lösung.

### Behobene Probleme:
- ✅ WebSocket-Fehler \`wss://localhost/v2\` 
- ✅ Vite HMR läuft nicht mehr in Production
- ✅ Verbesserte Deployment-Dokumentation
- ✅ QUICK_FIX.md mit Schritt-für-Schritt-Anleitung

### Neue Features:
- ✅ Download-Seite in der App (/download)
- ✅ Selektive Push-Benachrichtigungen im Alarm-Simulator
- ✅ Verbesserte Fehlerbehandlung

### Installation:
1. ZIP herunterladen und entpacken
2. \`npm install\`
3. \`.env\` erstellen (siehe \`.env.example\`)
4. **WICHTIG:** \`npm run build\` (Production Build!)
5. \`pm2 start ecosystem.config.cjs\` (nicht \`npm run dev\`!)

### Deployment auf Raspberry Pi:
\`\`\`bash
cd /home/pi/evt
npm run build              # Production Build erstellen
pm2 start ecosystem.config.cjs  # Mit PM2 starten (Production)
pm2 save                   # Konfiguration speichern
\`\`\`

### Falls WebSocket-Fehler auftritt:
Siehe **QUICK_FIX.md** im ZIP-Archiv!

### Dokumentation:
- \`QUICK_FIX.md\` - WebSocket-Fehler beheben
- \`DEPLOYMENT.md\` - Vollständige Raspberry Pi Installation
- \`deploy.sh\` - Automatisches Deployment-Skript`,
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
  
  const url = new URL(`${uploadUrl}?name=${fileName}&label=EVT%20v1.0.1%20-%20Production%20Ready`);
  
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
    console.log('\n🎉 Successfully uploaded v1.0.1 to GitHub!');
    console.log(`Repository: https://github.com/${REPO}`);
    console.log(`Release: https://github.com/${REPO}/releases/tag/${TAG}`);
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  }
}

main();
