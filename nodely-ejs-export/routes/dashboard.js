const express = require('express');
const router  = express.Router();
const mqtt    = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── MQTT publish helper (connect-per-request for Vercel/serverless) ───────────
// Uses HiveMQ Cloud over TLS (mqtts:// port 8883)
function mqttPublish(deviceUuid, command) {
  return new Promise((resolve) => {
    const client = mqtt.connect(
      `mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
      {
        username:       process.env.MQTT_USER,
        password:       process.env.MQTT_PASS,
        connectTimeout: 5000,
        reconnectPeriod: 0, // no auto-reconnect — fire and forget
      }
    );

    client.on('connect', () => {
      client.publish(
        `nodely/${deviceUuid}/command`,
        command,
        { retain: true, qos: 1 },
        () => {
          console.log(`[MQTT] "${command}" → nodely/${deviceUuid}/command`);
          client.end();
          resolve();
        }
      );
    });

    client.on('error', (err) => {
      console.error('[MQTT] publish failed:', err.message);
      client.end();
      resolve(); // don't crash the HTTP request if MQTT is down
    });
  });
}

// ── Dashboard home ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data: devices, error } = await supabaseAdmin
      .from('devices').select('*')
      .eq('owner_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const now = new Date();
    const onlineCount = (devices || []).filter(d => {
      if (!d.last_seen) return false;
      return (now - new Date(d.last_seen)) < 60000;
    }).length;

    res.render('dashboard', {
      title:      'Dashboard',
      devices:    devices || [],
      onlineCount,
      totalCount: devices?.length || 0,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', { title: 'Dashboard', devices: [], onlineCount: 0, totalCount: 0, error: 'Failed to load devices' });
  }
});

// ── Toggle relay ───────────────────────────────────────────────────────────────
router.post('/toggle-relay/:id', async (req, res) => {
  const { id }    = req.params;
  const { state } = req.body;

  try {
    const { data: device, error: fetchErr } = await supabaseAdmin
      .from('devices').select('device_uuid, locked').eq('id', id).eq('owner_id', req.user.id).single();

    if (fetchErr || !device) return res.json({ success: false, error: 'Device not found' });
    if (device.locked)       return res.json({ success: false, error: 'Device is locked by admin' });

    // 1. Write to Supabase (source of truth)
    const { error } = await supabaseAdmin
      .from('devices').update({ relay_state: state }).eq('id', id).eq('owner_id', req.user.id);
    if (error) throw error;

    // 2. Push instant MQTT command to ESP32 (~20-50ms)
    await mqttPublish(device.device_uuid, state ? 'ON' : 'OFF');

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── Rename device ──────────────────────────────────────────────────────────────
router.post('/rename/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('devices').update({ device_name: req.body.name }).eq('id', req.params.id).eq('owner_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── Delete (unclaim) device ────────────────────────────────────────────────────
router.post('/delete/:id', async (req, res) => {
  try {
    const { data: device } = await supabaseAdmin
      .from('devices').select('device_uuid').eq('id', req.params.id).eq('owner_id', req.user.id).single();

    if (device) await mqttPublish(device.device_uuid, 'OFF');

    const { error } = await supabaseAdmin
      .from('devices')
      .update({ owner_id: null, claimed: false, device_name: null })
      .eq('id', req.params.id).eq('owner_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── Claim device ───────────────────────────────────────────────────────────────
router.post('/claim', async (req, res) => {
  const { device_uuid, device_name } = req.body;
  try {
    const { data: device, error: fetchError } = await supabaseAdmin
      .from('devices').select('*').eq('device_uuid', device_uuid).single();

    if (fetchError || !device) return res.json({ success: false, error: 'Device not found' });
    if (device.claimed)        return res.json({ success: false, error: 'Device already claimed' });

    const { error } = await supabaseAdmin
      .from('devices')
      .update({ owner_id: req.user.id, claimed: true, device_name: device_name || `Device ${device_uuid.slice(0, 8)}` })
      .eq('device_uuid', device_uuid).eq('claimed', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
