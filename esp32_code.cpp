
/**
 * ESP32 + RC522 RFID SCANNER FIRMWARE (FIXED)
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Pin Definitions based on your wiring
#define SS_PIN    22
#define RST_PIN   4
#define BUZZER_PIN 14 
#define LED_PIN    2

MFRC522 mfrc522(SS_PIN, RST_PIN);

// Config
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASS";

// We will use the .local address directly. 
// Most ESP32 libraries handle this automatically.
const char* serverApi = "http://campussync.local:5001/api/scan";

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  SPI.begin();
  mfrc522.PCD_Init();
  
  WiFi.begin(ssid, password);
  Serial.println("\nCONNECTING TO WIFI...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWIFI CONNECTED!");
  
  // Alert with buzzer
  tone(BUZZER_PIN, 2000, 500);
  delay(500);

  // Set up mDNS
  if (!MDNS.begin("esp32-client")) {
    Serial.println("Error setting up MDNS responder!");
  }
  
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("-------------------------");
  Serial.println("SCAN YOUR RFID");
  Serial.println("-------------------------");
}

void notifySuccess() {
  digitalWrite(LED_PIN, HIGH);
  tone(BUZZER_PIN, 2000, 200);
  delay(500);
  digitalWrite(LED_PIN, LOW);
}

void notifyError() {
  for(int i=0; i<3; i++) {
    tone(BUZZER_PIN, 500, 100);
    delay(150);
  }
}

void loop() {
  // Check for new RFID tag
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Parse UID
  String uidStr = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uidStr += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uidStr += String(mfrc522.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();
  Serial.println("UID Detected: " + uidStr);

  // Send POST Request to MERN Backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverApi);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["rfidUid"] = uidStr;
    String json;
    serializeJson(doc, json);

    int code = http.POST(json);
    
    if (code == 200) {
      String response = http.getString();
      JsonDocument resDoc;
      deserializeJson(resDoc, response);
      
      String studentName = resDoc["name"];
      Serial.println("NAME: " + studentName);
      Serial.println("SCAN CONFIRMED");
      
      notifySuccess();
    } else {
      Serial.println("Server Error: " + String(code));
      notifyError();
    }
    http.end();
  }

  delay(2000); // Debounce
  Serial.println("\nSCAN YOUR RFID");
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
