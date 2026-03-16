# Nodely — IoT Device Management Platform

> Final Year Project by **net2coder**
> Live at: **https://nodely.net2coder.in**

Nodely is a cloud-based IoT device management platform for ESP32 devices. It enables real-time relay control, OTA firmware updates, device claiming, and role-based admin access — all backed by Supabase.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend (SSR option):** Node.js + Express + EJS (`nodely-ejs-export/`)
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security + Edge Functions)
- **Device:** ESP32 with Arduino firmware (`nodely.ino`)

---

## Project Structure

```
nodely/
├── src/                        # React frontend (Vite)
│   ├── pages/                  # Route pages
│   ├── components/             # UI components
│   ├── hooks/                  # Auth, realtime, notifications
│   └── integrations/supabase/  # Supabase client + types
├── nodely-ejs-export/          # Express + EJS version (self-hosted)
│   ├── server.js
│   ├── routes/
│   ├── views/
│   └── public/
├── supabase/
│   ├── functions/              # Edge functions (ESP32 API)
│   └── migrations/             # Database migrations
└── nodely-ejs-export/supabase-schema.sql  # Full DB schema
```

---

## Getting Started (React / Vite)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Fill in your Supabase credentials

# Start dev server
npm run dev

# Build for production
npm run build
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://rrycgonvlguqnkalupnp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

---

## Getting Started (Express / EJS — self-hosted)

```bash
cd nodely-ejs-export
npm install
cp .env.example .env
# Fill in your credentials
npm start
```

---

## Database Setup

Run the SQL in `nodely-ejs-export/supabase-schema.sql` in your Supabase SQL Editor.

---

## ESP32 Firmware

Open `nodely.ino` in Arduino IDE. The device will:
1. Connect to WiFi via WiFiManager (captive portal `NODELY-SETUP`)
2. Register with the backend and print a claim URL to Serial
3. Poll for relay commands every 6 seconds
4. Check for OTA firmware updates every 10 minutes

---

## Supabase Edge Functions

Deploy from the `supabase/functions/` directory:

```bash
supabase functions deploy register-device
supabase functions deploy get-command
supabase functions deploy update-state
supabase functions deploy get-firmware
supabase functions deploy claim-device
```

---

## Deployment

### Frontend (Vite)
```bash
npm run build
# Deploy the dist/ folder to any static host (Netlify, Vercel, Nginx, etc.)
```

### Backend (Express)
```bash
cd nodely-ejs-export
npm start
# Use PM2 or systemd for production process management
```

---

## License

MIT — Built by net2coder as a Final Year Project.
