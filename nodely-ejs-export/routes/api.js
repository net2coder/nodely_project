const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Register device ────────────────────────────────────────────────────────────
router.post('/register-device', async (req, res) => {
  const { hardware_id } = req.body;
  if (!hardware_id) return res.status(400).json({ error: 'hardware_id is required' });

  try {
    const { data: existing } = await supabaseAdmin
      .from('devices').select('device_uuid').eq('hardware_id', hardware_id).single();

    if (existing) {
      return res.json({
        device_uuid: existing.device_uuid,
        claim_url: `${process.env.APP_URL}/claim/${existing.device_uuid}`,
        already_registered: true,
      });
    }

    const device_uuid = crypto.randomUUID();
    const { error } = await supabaseAdmin
      .from('devices').insert({ hardware_id, device_uuid, firmware_version: '1.0.0' });
    if (error) throw error;

    res.json({
      device_uuid,
      claim_url: `${process.env.APP_URL}/claim/${device_uuid}`,
      already_registered: false,
    });
  } catch (err) {
    console.error('Register device error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get command (HTTP fallback when MQTT drops) ────────────────────────────────
router.get('/get-command', async (req, res) => {
  const deviceUuid = req.headers['x-device-uuid'];
  if (!deviceUuid) return res.status(400).json({ error: 'x-device-uuid required' });

  try {
    const { data: device, error } = await supabaseAdmin
      .from('devices').select('relay_state, locked').eq('device_uuid', deviceUuid).single();
    if (error || !device) return res.status(404).json({ error: 'Device not found' });

    const command = device.locked ? 'OFF' : (device.relay_state ? 'ON' : 'OFF');
    res.json({ command, locked: device.locked });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update state ───────────────────────────────────────────────────────────────
router.post('/update-state', async (req, res) => {
  const deviceUuid = req.headers['x-device-uuid'];
  const { state, firmware_version } = req.body;
  if (!deviceUuid) return res.status(400).json({ error: 'x-device-uuid required' });
  if (typeof state !== 'boolean') return res.status(400).json({ error: 'state (boolean) required' });

  try {
    const updateData = { relay_state: state, last_seen: new Date().toISOString() };
    if (firmware_version) updateData.firmware_version = firmware_version;
    const { error } = await supabaseAdmin.from('devices').update(updateData).eq('device_uuid', deviceUuid);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get firmware ───────────────────────────────────────────────────────────────
router.get('/get-firmware', async (req, res) => {
  try {
    const { data: firmware } = await supabaseAdmin
      .from('firmware').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!firmware) return res.json({ version: '1.0.0', url: null, message: 'No updates available' });
    res.json({ version: firmware.version, url: firmware.url, changelog: firmware.changelog });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update profile ─────────────────────────────────────────────────────────────
router.post('/update-profile', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: req.body.full_name, updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
