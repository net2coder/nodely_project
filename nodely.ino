/*
  Nodely ESP32 Firmware — HiveMQ Cloud Edition
  MQTT broker: HiveMQ Cloud (TLS port 8883)
  Primary:  MQTT subscribe for instant relay commands (~20-50ms)
  Fallback: HTTP poll every 30s if MQTT drops
  OTA:      HTTP check every 10 minutes
*/

#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <Update.h>

// ── Pin & version ─────────────────────────────────────────────────────────────
#define RELAY_PIN       26
#define RELAY_ON        LOW
#define RELAY_OFF       HIGH
#define CURRENT_VERSION "1.0.0"
#define NODELY_APP_URL  "https://nodely.net2coder.in"

// ── HiveMQ Cloud credentials ──────────────────────────────────────────────────
#define MQTT_HOST "022dbd443000406096a82f256d40a1e3.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "nodely"
#define MQTT_PASS "Alokraj5145n"

// ── Supabase HTTP endpoints ───────────────────────────────────────────────────
const char* REGISTER_URL = "https://rrycgonvlguqnkalupnp.supabase.co/functions/v1/register-device";
const char* STATE_URL    = "https://rrycgonvlguqnkalupnp.supabase.co/functions/v1/update-state";
const char* COMMAND_URL  = "https://rrycgonvlguqnkalupnp.supabase.co/functions/v1/get-command";
const char* OTA_URL      = "https://rrycgonvlguqnkalupnp.supabase.co/functions/v1/get-firmware";

// ── State ─────────────────────────────────────────────────────────────────────
Preferences      prefs;
String           deviceUUID;
String           commandTopic;
bool             relayState   = false;
bool             deviceLocked = false;

WiFiClientSecure secureClient;
PubSubClient     mqttClient(secureClient);

// ── Hardware ID ───────────────────────────────────────────────────────────────
String hardwareID() {
  uint64_t mac = ESP.getEfuseMac();
  return "NODELY-" + String((uint32_t)(mac >> 32), HEX) + String((uint32_t)mac, HEX);
}

void saveUUID(String u) { prefs.begin("node", false); prefs.putString("uuid", u); prefs.end(); }
String loadUUID()       { prefs.begin("node", true);  String u = prefs.getString("uuid"); prefs.end(); return u; }

// ── Relay ─────────────────────────────────────────────────────────────────────
void applyRelay(bool on) {
  relayState = on;
  digitalWrite(RELAY_PIN, on ? RELAY_ON : RELAY_OFF);
  Serial.printf("[RELAY] %s\n", on ? "ON" : "OFF");
  reportState(on);
}

// ── Report state to Supabase ──────────────────────────────────────────────────
void reportState(bool on) {
  if (!WiFi.isConnected()) return;
  HTTPClient http;
  http.begin(STATE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-uuid", deviceUUID);
  StaticJsonDocument<64> d;
  d["state"]            = on;
  d["firmware_version"] = CURRENT_VERSION;
  String body; serializeJson(d, body);
  http.POST(body);
  http.end();
}

// ── MQTT message callback ─────────────────────────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.printf("[MQTT] %s → %s\n", topic, msg.c_str());

  if      (msg == "ON"   && !deviceLocked) applyRelay(true);
  else if (msg == "OFF")                   applyRelay(false);
  else if (msg == "LOCK") {
    deviceLocked = true;
    applyRelay(false);
    Serial.println("[MQTT] Device LOCKED by admin");
  }
  else if (msg == "UNLOCK") {
    deviceLocked = false;
    Serial.println("[MQTT] Device UNLOCKED");
  }
}

// ── MQTT connect ──────────────────────────────────────────────────────────────
void connectMQTT() {
  secureClient.setInsecure(); // skip cert verification — fine for project use
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setKeepAlive(60);
  mqttClient.setBufferSize(512);

  Serial.print("[MQTT] Connecting to HiveMQ Cloud...");
  String clientId = "NODELY-" + deviceUUID;

  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println(" connected!");
    mqttClient.subscribe(commandTopic.c_str(), 1); // QoS 1
    Serial.println("[MQTT] Subscribed: " + commandTopic);

    // Publish online status (retained so dashboard knows device is live)
    String statusTopic = "nodely/" + deviceUUID + "/status";
    mqttClient.publish(statusTopic.c_str(), "online", true);
  } else {
    Serial.printf(" failed rc=%d\n", mqttClient.state());
  }
}

// ── HTTP fallback (only runs when MQTT is disconnected) ───────────────────────
void httpFallbackPoll() {
  if (mqttClient.connected()) return;
  Serial.println("[HTTP] MQTT down — fallback poll");

  HTTPClient http;
  http.begin(COMMAND_URL);
  http.addHeader("x-device-uuid", deviceUUID);

  if (http.GET() == 200) {
    StaticJsonDocument<128> c;
    deserializeJson(c, http.getString());
    deviceLocked = c["locked"].as<bool>();
    if (deviceLocked) {
      applyRelay(false);
    } else {
      String cmd = c["command"].as<String>();
      if (cmd == "ON")  applyRelay(true);
      if (cmd == "OFF") applyRelay(false);
    }
  }
  http.end();
}

// ── Registration ──────────────────────────────────────────────────────────────
void registerDevice() {
  if (deviceUUID.length()) {
    Serial.println("[INFO] UUID: " + deviceUUID);
    Serial.println("[INFO] Claim: " + String(NODELY_APP_URL) + "/claim/" + deviceUUID);
    return;
  }
  Serial.println("[INFO] Registering device...");
  HTTPClient http;
  http.begin(REGISTER_URL);
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<128> d;
  d["hardware_id"] = hardwareID();
  String body; serializeJson(d, body);
  if (http.POST(body) == 200) {
    StaticJsonDocument<256> r;
    deserializeJson(r, http.getString());
    deviceUUID = r["device_uuid"].as<String>();
    saveUUID(deviceUUID);
    Serial.println("[OK] Registered! UUID: " + deviceUUID);
    Serial.println("[OK] Claim: " + String(NODELY_APP_URL) + "/claim/" + deviceUUID);
  } else {
    Serial.println("[ERROR] Registration failed!");
  }
  http.end();
}

// ── OTA ───────────────────────────────────────────────────────────────────────
void checkOTA() {
  HTTPClient http;
  http.begin(OTA_URL);
  if (http.GET() != 200) { http.end(); return; }
  StaticJsonDocument<256> f;
  if (deserializeJson(f, http.getString())) { http.end(); return; }
  http.end();
  const char* newVersion = f["version"];
  const char* binUrl     = f["url"];
  if (!newVersion || !binUrl) return;
  if (strcmp(newVersion, CURRENT_VERSION) == 0) return;
  Serial.println("[OTA] Updating to " + String(newVersion));
  WiFiClient plain;
  HTTPClient binHttp;
  binHttp.begin(plain, binUrl);
  if (binHttp.GET() != 200) { binHttp.end(); return; }
  int len = binHttp.getSize();
  if (len <= 0 || !Update.begin(len)) { binHttp.end(); return; }
  Update.writeStream(*binHttp.getStreamPtr());
  if (Update.end(true)) { Serial.println("[OTA] Done — rebooting"); delay(500); ESP.restart(); }
  binHttp.end();
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n======================================");
  Serial.println("  NODELY ESP32 — HiveMQ Cloud Edition");
  Serial.println("======================================");
  Serial.println("Firmware: " CURRENT_VERSION);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  WiFiManager wm;
  wm.autoConnect("NODELY-SETUP");
  Serial.println("[OK] WiFi: " + WiFi.localIP().toString());

  deviceUUID = loadUUID();
  registerDevice();

  commandTopic = "nodely/" + deviceUUID + "/command";
  connectMQTT();

  Serial.println("\n[OK] Ready — listening for MQTT commands\n");
}

// ── LOOP ──────────────────────────────────────────────────────────────────────
unsigned long lastFallback  = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastOTA       = 0;

void loop() {
  if (WiFi.isConnected()) {
    if (!mqttClient.connected()) connectMQTT();
    mqttClient.loop(); // non-blocking — dispatches incoming messages instantly
  }

  unsigned long now = millis();

  // HTTP fallback poll every 30s (only fires if MQTT is down)
  if (now - lastFallback > 30000) {
    httpFallbackPoll();
    lastFallback = now;
  }

  // Heartbeat: keep last_seen fresh in Supabase every 30s
  if (now - lastHeartbeat > 30000) {
    reportState(relayState);
    lastHeartbeat = now;
  }

  // OTA check every 10 minutes
  if (now - lastOTA > 600000) {
    checkOTA();
    lastOTA = now;
  }

  delay(10); // yield to WiFi stack
}
