#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// --- Configuración de Pines ---
const int FINGERPRINT_RX_PIN = 2;
const int FINGERPRINT_TX_PIN = 3;
const int LED_VERDE_PIN = 8;
const int LED_ROJO_PIN = 9;

SoftwareSerial mySerial(FINGERPRINT_RX_PIN, FINGERPRINT_TX_PIN);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(9600);
  finger.begin(57600);

  pinMode(LED_VERDE_PIN, OUTPUT);
  pinMode(LED_ROJO_PIN, OUTPUT);
  digitalWrite(LED_VERDE_PIN, LOW);
  digitalWrite(LED_ROJO_PIN, LOW);

  delay(500); // Dar tiempo para que todo se inicialice

  if (finger.verifyPassword()) {
    Serial.println("SENSOR_OK");
  } else {
    Serial.println("SENSOR_ERROR");
  }
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "PING") {
      Serial.println("PONG");
      // Parpadeo verde para indicar que recibió un comando
      digitalWrite(LED_VERDE_PIN, HIGH);
      delay(200);
      digitalWrite(LED_VERDE_PIN, LOW);
    }
    else if (command == "STATUS") {
      // Verificar el estado del sensor
      if (finger.verifyPassword()) {
        Serial.println("SENSOR_OK");
        // Parpadeo verde para indicar que el sensor está bien
        digitalWrite(LED_VERDE_PIN, HIGH);
        delay(100);
        digitalWrite(LED_VERDE_PIN, LOW);
        delay(100);
        digitalWrite(LED_VERDE_PIN, HIGH);
        delay(100);
        digitalWrite(LED_VERDE_PIN, LOW);
      } else {
        Serial.println("SENSOR_ERROR");
        // Parpadeo rojo para indicar error
        digitalWrite(LED_ROJO_PIN, HIGH);
        delay(500);
        digitalWrite(LED_ROJO_PIN, LOW);
      }
    }
    else if (command == "ENROLL") {
      enrollFingerprint();
    }
  }
}

// Nueva función para inscribir huellas dactilares
void enrollFingerprint() {
  Serial.println("ENROLL_START"); // Avisa al PC que el proceso comenzó
  digitalWrite(LED_ROJO_PIN, HIGH); // LED rojo indica "listo para enrollar"
  delay(1000);
  digitalWrite(LED_ROJO_PIN, LOW);

  int id = 1; // Por ahora, usamos una ID fija. En el futuro, la recibiremos del PC.

  // Primera captura
  Serial.println("PLACE_FINGER");
  while (finger.getImage() != FINGERPRINT_OK) {
    delay(50);
  }
  
  if (finger.image2Tz(1) != FINGERPRINT_OK) {
    Serial.println("ENROLL_ERROR:FAILED_TO_CONVERT_1");
    return;
  }
  
  Serial.println("REMOVE_FINGER");
  delay(2000);
  
  // Esperar a que se quite el dedo
  while (finger.getImage() == FINGERPRINT_OK) {
    delay(50);
  }

  // Segunda captura
  Serial.println("PLACE_AGAIN");
  while (finger.getImage() != FINGERPRINT_OK) {
    delay(50);
  }
  
  if (finger.image2Tz(2) != FINGERPRINT_OK) {
    Serial.println("ENROLL_ERROR:FAILED_TO_CONVERT_2");
    return;
  }

  // Crear modelo y guardar
  if (finger.createModel() != FINGERPRINT_OK) {
    Serial.println("ENROLL_ERROR:FAILED_TO_CREATE_MODEL");
    return;
  }
  
  if (finger.storeModel(id) != FINGERPRINT_OK) {
    Serial.println("ENROLL_ERROR:FAILED_TO_STORE");
    return;
  }

  Serial.print("ENROLL_SUCCESS:ID=");
  Serial.println(id);

  // Parpadeo verde para indicar éxito
  digitalWrite(LED_VERDE_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_VERDE_PIN, LOW);
}
