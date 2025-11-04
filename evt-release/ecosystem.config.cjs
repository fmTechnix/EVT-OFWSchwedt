// PM2 Ecosystem Configuration für EVT
// Feuerwehr Schwedt/Oder - Einsatzverwaltungstool

module.exports = {
  apps: [
    {
      name: 'evt',
      script: 'dist/index.js',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      
      // Process Management
      instances: 1,  // Single instance (Raspberry Pi hat begrenzte Ressourcen)
      exec_mode: 'fork',
      
      // Auto-Restart bei Fehlern
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',  // Restart bei > 500MB RAM-Nutzung
      
      // Restart-Strategie
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Logging
      error_file: '/home/pi/evt/logs/pm2-error.log',
      out_file: '/home/pi/evt/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Cron-Restart (optional: täglich um 3 Uhr)
      // cron_restart: '0 3 * * *',
      
      // Environment-Datei laden
      env_file: '.env',
      
      // Advanced Settings
      time: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],

  // Deployment-Konfiguration (optional für spätere Updates)
  deploy: {
    production: {
      user: 'pi',
      host: 'evt-ofwschwedt.de',
      ref: 'origin/main',
      repo: 'GIT_REPOSITORY_URL',
      path: '/home/pi/evt',
      'post-deploy': 'npm install --production && npm run build && npm run db:push && pm2 reload ecosystem.config.cjs --env production',
      'pre-deploy-local': '',
    },
  },
};
