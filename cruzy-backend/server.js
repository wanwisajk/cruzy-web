const cors = require('cors');
const express = require('express');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

const consoleRoutes = require('./routes/consoleRoutes');

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cruzy Backend Running'
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'cruzy-backend'
  });
});

app.use('/api', consoleRoutes);

app.listen(PORT, () => {
  console.log(`Cruzy backend running at http://localhost:${PORT}`);
});
