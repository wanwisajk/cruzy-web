const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.FRONTEND_PORT || 5555;
const frontendPath = __dirname;

app.get('/app-config.js', (req, res) => {
  res.type('application/javascript');
  const apiUrl = process.env.API_URL || 'http://localhost:7000/api';
  res.send(`window.__APP_CONFIG = { API_URL: ${JSON.stringify(apiUrl)} };`);
});

app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cruzy frontend running at http://localhost:${PORT}`);
});
