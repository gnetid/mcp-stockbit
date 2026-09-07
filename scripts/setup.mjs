#!/usr/bin/env node
// scripts/setup.mjs
// Automated cross-machine setup for Stockbit MCP & Dashboard

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MCP_SERVER_PATH = path.join(PROJECT_ROOT, 'src', 'mcpServer.mjs');

console.log(`\n======================================================`);
console.log(` ⚡ STOCKBIT MCP & DASHBOARD AUTOMATED SETUP`);
console.log(`======================================================`);
console.log(`Project Directory: ${PROJECT_ROOT}`);
console.log(`MCP Server Target: ${MCP_SERVER_PATH}\n`);

// 1. Update MCP configuration files with actual local paths
const mcpConfigObj = {
  mcpServers: {
    stockbit: {
      command: 'node',
      args: [MCP_SERVER_PATH],
      env: {}
    }
  }
};

const configFiles = [
  path.join(PROJECT_ROOT, 'mcp_config.json'),
  path.join(PROJECT_ROOT, '.agents', 'mcp_config.json'),
  path.join(PROJECT_ROOT, '.agents', 'plugins', 'stockbit', 'mcp_config.json')
];

for (const cfgFile of configFiles) {
  try {
    const dir = path.dirname(cfgFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cfgFile, JSON.stringify(mcpConfigObj, null, 2), 'utf8');
    console.log(`✓ Updated MCP config: ${path.relative(PROJECT_ROOT, cfgFile)}`);
  } catch (err) {
    console.warn(`! Could not update ${cfgFile}: ${err.message}`);
  }
}

// 2. Detect Stockbit Desktop executable on Windows
if (process.platform === 'win32') {
  const possiblePaths = [
    'C:\\Program Files\\Stockbit\\Stockbit.exe',
    'C:\\Program Files (x86)\\Stockbit\\Stockbit.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Stockbit', 'Stockbit.exe'),
    path.join(process.env.APPDATA || '', 'Programs', 'Stockbit', 'Stockbit.exe')
  ];

  let foundPath = possiblePaths.find(p => fs.existsSync(p));
  if (foundPath) {
    console.log(`✓ Detected Stockbit Desktop: ${foundPath}`);
  } else {
    console.log(`ℹ Stockbit.exe not found in default paths. You can launch it manually with '--remote-debugging-port=9222'.`);
  }

  // 3. Check / Auto-configure Claude Desktop if installed
  const claudeDir = path.join(process.env.APPDATA || '', 'Claude');
  if (fs.existsSync(claudeDir)) {
    const claudeConfigPath = path.join(claudeDir, 'claude_desktop_config.json');
    try {
      let claudeConfig = {};
      if (fs.existsSync(claudeConfigPath)) {
        try {
          claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
        } catch {
          claudeConfig = {};
        }
      }
      claudeConfig.mcpServers = claudeConfig.mcpServers || {};
      claudeConfig.mcpServers.stockbit = {
        command: 'node',
        args: [MCP_SERVER_PATH]
      };
      fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2), 'utf8');
      console.log(`✓ Auto-configured Claude Desktop: ${claudeConfigPath}`);
    } catch (err) {
      console.warn(`! Could not update Claude Desktop config: ${err.message}`);
    }
  }
}

// 4. Test port 9222 status
console.log('\nChecking Stockbit CDP port 9222...');
let called = false;
function done(statusMsg) {
  if (called) return;
  called = true;
  if (statusMsg) console.log(statusMsg);
  printSuccessMessage();
}

const req = http.get('http://127.0.0.1:9222/json/version', { timeout: 2000 }, (res) => {
  if (res.statusCode === 200) {
    done('✓ Stockbit Desktop is RUNNING and connected on port 9222!');
  } else {
    done(`ℹ Port 9222 responded with status: ${res.statusCode}`);
  }
});

req.on('error', () => {
  done('ℹ Stockbit Desktop is not running on port 9222 yet.\n  -> Launch it using: launch-stockbit.bat');
});

req.on('timeout', () => {
  req.destroy();
  done('ℹ Stockbit Desktop port check timed out.');
});

function printSuccessMessage() {
  console.log(`\n======================================================`);
  console.log(` 🎉 SETUP SELESAI & SIAP DIGUNAKAN!`);
  console.log(`======================================================`);
  console.log(`1. Nyalakan Stockbit:     launch-stockbit.bat (atau flag --remote-debugging-port=9222)`);
  console.log(`2. Buka Web Dashboard:    start-dashboard.bat (atau npm run dashboard)`);
  console.log(`3. Integrasi AI (MCP):    Sudah terkonfigurasi otomatis di .agents/ & mcp_config.json`);
  console.log(`4. Tes Koneksi:           npm test\n`);
}
