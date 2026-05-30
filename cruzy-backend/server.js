const cors = require('cors');
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const consoleRoutes = require('./routes/consoleRoutes');

const app = express();
const PORT = process.env.PORT;
const frontendPath = path.join(__dirname, '..', 'cruzy-frontend');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'cruzy-backend' });
});

app.get('/app-config.js', (req, res) => {
  res.type('application/javascript');
const apiUrl = process.env.API_URL || '/api';
  res.send(`window.__APP_CONFIG = { API_URL: ${JSON.stringify(apiUrl)} };`);
});

app.use('/api', consoleRoutes);

app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cruzy backend running at http://localhost:${PORT}`);
});
