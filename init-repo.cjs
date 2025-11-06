const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'fmTechnix/EVT';

const readme = `# EVT - Feuerwehr-Einsatzverwaltungstool

Einsatzverwaltungssystem für die Feuerwehr Schwedt/Oder mit automatischer Crew-Zuteilung, Push-Benachrichtigungen und AAO-Integration.

## Features

- **Automatische Crew-Zuteilung**: 14 Qualifikationen, 9 Fahrzeugtypen
- **Push-Benachrichtigungen**: PWA mit Web Push API
- **AAO-System**: Alarm- und Ausrückeordnung für keyword-basierte Fahrzeugdisposition
- **DE-Alarm Integration**: Live-Alarm-Integration mit automatischer Crew-Redistribution
- **Fairness/Rotation-System**: Gerechte Positions-Verteilung mit Rotation
- **Verfügbarkeitsvorlagen**: Wiederverwendbare Schichtmuster
- **Mängelmeldungen**: Fahrzeugdefekt-Reporting
- **Kalender**: Event-Management mit RSVP

## Technologie

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express.js + PostgreSQL
- **PWA**: Service Worker, Push Notifications
- **Deployment**: Raspberry Pi via Cloudflare Tunnel

## Installation

Siehe [Releases](https://github.com/fmTechnix/EVT/releases) für den vollständigen Quellcode.

1. ZIP herunterladen und entpacken
2. \`npm install\`
3. \`.env\` Datei erstellen (siehe \`.env.example\`)
4. \`npm run dev\`

Siehe \`DEPLOYMENT.md\` für Raspberry Pi Installation.

## License

Proprietär - Feuerwehr Schwedt/Oder
`;

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

async function createReadme() {
  console.log('Creating README.md on GitHub...');
  
  const content = Buffer.from(readme).toString('base64');
  const data = JSON.stringify({
    message: 'Initial commit: Add README',
    content: content
  });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO}/contents/README.md`,
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'User-Agent': 'Node.js',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  try {
    const result = await makeRequest(options, data);
    console.log('✅ README.md created successfully!');
    console.log(`Repository initialized: https://github.com/${REPO}`);
    return result;
  } catch (error) {
    console.error('Error creating README:', error.message);
    throw error;
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('ERROR: GITHUB_TOKEN not found');
    process.exit(1);
  }

  try {
    await createReadme();
    console.log('\n✅ Repository is now initialized!');
    console.log('You can now create releases.');
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
