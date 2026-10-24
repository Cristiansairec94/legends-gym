const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = process.env.PORT || 5173;
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// Start backend sync server if not already running
try {
  const { startServer } = require('./syncServer.cjs');
  startServer(3001);
} catch (err) {
  console.log('[SYNC] Aviso sobre servidor de sincronización:', err.message);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Security: prevent directory traversal
  let safePath = path.normalize(path.join(DIST_DIR, pathname));
  if (!safePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end('Acceso denegado');
  }

  // Check if file exists
  fs.stat(safePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
      });
      return fs.createReadStream(safePath).pipe(res);
    }

    // SPA Fallback: serve index.html for all non-file routes
    const indexPath = path.join(DIST_DIR, 'index.html');
    fs.readFile(indexPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Error: Compilación dist/ no encontrada. Ejecuta npm run build primero.');
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n======================================================');
  console.log('   🏋️ FITNESS LEGENDS GYM — SERVIDOR WEB ACTIVO');
  console.log('======================================================');
  console.log(`[*] Servidor local: http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`[*] Acceso en red LAN: http://${ip}:${PORT}`);
  });
  console.log('======================================================\n');
  console.log('Abriendo navegador automáticamente...');

  // Automatically launch default browser
  const startCmd = process.platform === 'win32' ? `start http://localhost:${PORT}` : `xdg-open http://localhost:${PORT}`;
  exec(startCmd);
});
