# Cruzy Admin v2 Deploy

## Backend

Deploy `cruzy-backend` as a Node/Express API service.

Required environment variables:

```env
SERVE_FRONTEND=false
FRONTEND_ORIGIN=https://your-frontend-domain.com
SUPABASE_URL=...
SUPABASE_KEY=...
API_URL=https://your-backend-domain.com/api
JWT_SECRET=...
```

Do not set `PORT` manually on Railway. Railway injects its own `PORT`, and the backend must listen on that value.

Start command:

```bash
npm start
```

Health check:

```text
GET /health
```

API base:

```text
/api
```

## Frontend

Deploy `cruzy-frontend` as static files.

Before deploy, set the backend URL in:

```text
cruzy-frontend/app-config.js
```

Example:

```js
window.__APP_CONFIG = {
  API_URL: 'https://your-backend-domain.com/api'
};
```

## Local Separate Dev

Run backend:

```bash
npm start
```

Serve frontend with any static server from `cruzy-frontend`.

The default local frontend config points to:

```text
http://localhost:5000/api
```

## Optional Integrated Mode

If you want backend to serve frontend too, set:

```env
SERVE_FRONTEND=true
API_URL=/api
```
