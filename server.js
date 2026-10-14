import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware for no-cache headers on HTML, PWA manifest, and Service Worker
app.use((req, res, next) => {
  const url = req.url.split('?')[0];
  if (
    url === '/' ||
    url.endsWith('.html') ||
    url === '/sw.js' ||
    url === '/registerSW.js' ||
    url.endsWith('.webmanifest') ||
    url.endsWith('.json')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Serve static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all other routes (SPA fallback) with no-cache headers
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PushUp Hero production server running on port ${PORT}`);
});
