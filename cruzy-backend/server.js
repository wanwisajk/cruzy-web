const cors = require('cors');
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const consoleRoutes = require('./routes/consoleRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const frontendPath = path.join(__dirname, '..', 'cruzy-frontend');
const serveFrontend = process.env.SERVE_FRONTEND === 'true';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'cruzy-backend' });
});

app.get('/app-config.js', (req, res) => {
  res.type('application/javascript');
  const apiUrl = process.env.API_URL || `http://localhost:${PORT}/api`;
  res.send(`window.__APP_CONFIG = { API_URL: ${JSON.stringify(apiUrl)} };`);
});

app.use('/api', consoleRoutes);

if (serveFrontend) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      service: 'cruzy-backend',
      mode: 'api-only',
      health: '/health',
      api: '/api'
    });
  });
}

app.listen(PORT, HOST, () => {
  console.log(`Cruzy backend API running on ${HOST}:${PORT}`);
  if (serveFrontend) {
    console.log(`Serving frontend from ${frontendPath}`);
  }
});
