# Nodely — Express + EJS (Self-Hosted)

Self-hosted backend for the Nodely IoT Device Management platform.
Deployed at: **https://nodely.net2coder.in**

---

## Quick Start

### 1. Install Dependencies

```bash
cd nodely-ejs-export
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
SUPABASE_URL=https://rrycgonvlguqnkalupnp.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # from Supabase dashboard → Settings → API
SESSION_SECRET=a-long-random-string-change-this
PORT=3000
NODE_ENV=production
APP_URL=https://nodely.net2coder.in
```

> Get your **Service Role Key** from:
> https://supabase.com/dashboard/project/rrycgonvlguqnkalupnp/settings/api

### 3. Run the Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## Project Structure

```
nodely-ejs-export/
├── server.js              # Main Express server
├── routes/
│   ├── auth.js            # Login, signup, OTP, logout
│   ├── dashboard.js       # User device management
│   ├── admin.js           # Admin panel
│   └── api.js             # ESP32 device API
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── index.ejs          # Landing page
│   ├── auth.ejs           # Login / Signup
│   ├── dashboard.ejs      # Device dashboard
│   ├── claim.ejs          # Claim a device
│   ├── settings.ejs       # User settings
│   ├── 404.ejs
│   └── admin/
│       ├── index.ejs      # Admin panel
│       └── firmware.ejs   # Firmware management
├── public/css/style.css
├── .env
└── .env.example
```

---

## ESP32 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register-device` | Register a new ESP32 device |
| GET | `/api/get-command` | Poll for relay ON/OFF command |
| POST | `/api/update-state` | Report relay state + last_seen |
| GET | `/api/get-firmware` | Get latest OTA firmware info |

---

## Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth` | Auth page |
| POST | `/auth/login` | Email + password login |
| POST | `/auth/signup` | Email signup |
| POST | `/auth/phone-login` | Send OTP to phone |
| POST | `/auth/verify-otp` | Verify OTP, create session |
| GET | `/auth/logout` | Destroy session |

---

## Database Setup

Run the full schema in your Supabase SQL Editor:

```
nodely-ejs-export/supabase-schema.sql
```

---

## Production Deployment (VPS / Ubuntu)

### With PM2

```bash
npm install -g pm2
pm2 start server.js --name nodely
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name nodely.net2coder.in;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable HTTPS with Certbot:

```bash
sudo certbot --nginx -d nodely.net2coder.in
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret!) |
| `SESSION_SECRET` | Express session secret (long random string) |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `development` or `production` |
| `APP_URL` | Full public URL of your app |

---

Built by **net2coder** — Final Year Project
