 export default
// Send POST Request to MERN Backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverApi);
    http.addHeader("Content-Type", "application/json");

    // Dito natin ilalagay ang login details kasama ang RFID UID
    StaticJsonDocument<256> doc; // Ginawang 256 para sa extra fields
    doc["rfidUid"] = uidStr;
    doc["userId"] = "2024-001";  // Ang userId na gusto mong idagdag
    doc["status"] = "cleared";   // Ang status para sa login

    String json;
    serializeJson(doc, json);

    Serial.println("Sending: " + json); // Para makita mo sa Serial Monitor

    int code = http.POST(json);
    
    if (code == 200) {
      String response = http.getString();
      Serial.println("Verified: " + response);
      notifySuccess();
    } else {
      Serial.println("Auth Error Code: " + String(code));
      notifyError();
    }
    http.end();
  }