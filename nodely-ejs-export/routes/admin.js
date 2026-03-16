const express = require('express');
const router  = express.Router();
const mqtt    = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function mqttPublish(deviceUuid, command) {
  return new Promise((resolve) => {
    const client = mqtt.connect(
      `mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
      { username: process.env.MQTT_USER, password: process.env.MQTT_PASS, connectTimeout: 5000, reconnectPeriod: 0 }
    );
    client.on('connect', () => {
      client.publish(`nodely/${deviceUuid}/command`, command, { retain: true, qos: 1 }, () => {
        console.log(`[MQTT] "${command}" → nodely/${deviceUuid}/command`);
        client.end(); resolve();
      });
    });
    client.on('error', (err) => { console.error('[MQTT]', err.message); client.end(); resolve(); });
  });
}

// ── Admin dashboard ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [devicesRes, profilesRes] = await Promise.all([
      supabaseAdmin.from('devices').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('profiles').select('*'),
    ]);
    res.render('admin/index', { title: 'Admin Panel', devices: devicesRes.data || [], profiles: profilesRes.data || [] });
  } catch (err) {
    res.render('admin/index', { title: 'Admin Panel', devices: [], profiles: [], error: 'Failed to load data' });
  }
});

// ── Firmware ───────────────────────────────────────────────────────────────────
router.get('/firmware', async (req, res) => {
  try {
    const { data: firmwares } = await supabaseAdmin.from('firmware').select('*').order('created_at', { ascending: false });
    res.render('admin/firmware', { title: 'Firmware Management', firmwares: firmwares || [] });
  } catch (err) {
    res.render('admin/firmware', { title: 'Firmware Management', firmwares: [], error: 'Failed to load firmware' });
  }
});

router.post('/firmware/add', async (req, res) => {
  const { version, url, changelog } = req.body;
  try {
    const { error } = await supabaseAdmin.from('firmware').insert({ version, url, changelog });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

router.post('/firmware/delete/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('firmware').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// ── Admin relay toggle ─────────────────────────────────────────────────────────
router.post('/toggle-relay/:id', async (req, res) => {
  const { state } = req.body;
  try {
    const { data: device } = await supabaseAdmin.from('devices').select('device_uuid').eq('id', req.params.id).single();
    const { error } = await supabaseAdmin.from('devices').update({ relay_state: state }).eq('id', req.params.id);
    if (error) throw error;
    if (device) await mqttPublish(device.device_uuid, state ? 'ON' : 'OFF');
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// ── Lock / unlock ──────────────────────────────────────────────────────────────
router.post('/toggle-lock/:id', async (req, res) => {
  const { locked } = req.body;
  try {
    const { data: device } = await supabaseAdmin.from('devices').select('device_uuid').eq('id', req.params.id).single();
    const { error } = await supabaseAdmin.from('devices').update({ locked }).eq('id', req.params.id);
    if (error) throw error;
    if (device) await mqttPublish(device.device_uuid, locked ? 'LOCK' : 'OFF');
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// ── Transfer ownership ─────────────────────────────────────────────────────────
router.post('/transfer/:id', async (req, res) => {
  const { new_owner_id } = req.body;
  try {
    const updateData = new_owner_id
      ? { owner_id: new_owner_id, claimed: true }
      : { owner_id: null, claimed: false, device_name: null };
    const { error } = await supabaseAdmin.from('devices').update(updateData).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
