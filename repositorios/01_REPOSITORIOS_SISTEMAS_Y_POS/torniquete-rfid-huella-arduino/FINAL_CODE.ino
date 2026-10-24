#include <SoftwareSerial.h>
#include <Adafruit_Fingerprint.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>

#define LED_PIN     5   // Pin connected to LED
#define BUZZER_PIN  7   // Pin connected to buzzer
#define FINGERPRINT_RX  2   // Pin connected to fingerprint sensor's TX pin
#define FINGERPRINT_TX  3   // Pin connected to fingerprint sensor's RX pin
#define SERVO_PIN  8   // Pin connected to servo motor
#define SS_PIN 10
#define RST_PIN 9

SoftwareSerial mySerial(FINGERPRINT_RX, FINGERPRINT_TX);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);
Servo myservo;
MFRC522 mfrc522(SS_PIN, RST_PIN); // Create MFRC522 instance.
bool useRFID = false;
bool useFingerprint = false;
bool enrolled = false;
bool fingerDetected = false;

void setup() {
  Serial.begin(9600); // Initiate serial communication
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);  // Ensure LED is off initially
  digitalWrite(BUZZER_PIN, LOW);  // Ensure buzzer is off initially
  myservo.attach(SERVO_PIN);
  SPI.begin(); // Initiate SPI bus
  mfrc522.PCD_Init(); // Initiate MFRC522

  Serial.println("Choose the sensor to use: ");
  Serial.println("1. RFID");
  Serial.println("2. Fingerprint");

  while (!Serial.available()) {
    // Wait for input
  }

  char choice = Serial.read();

  if (choice == '1') {
    useRFID = true;
  } else if (choice == '2') {
    useFingerprint = true;
  } else {
    Serial.println("Invalid choice.");
    while (1); // Wait indefinitely
  }

  if (useFingerprint) {
    finger.begin(57600);

    if (finger.verifyPassword()) {
      Serial.println("Found fingerprint sensor!");
    } else {
      Serial.println("Did not find fingerprint sensor :(");
      while (1); // Wait indefinitely
    }

    Serial.println("Waiting for valid finger to enroll...");
  }
}

void loop() {
  if (useRFID) {
    // Look for new cards
    if (mfrc522.PICC_IsNewCardPresent()) {
      // Select one of the cards
      if (mfrc522.PICC_ReadCardSerial()) {
        // Show UID on serial monitor
        Serial.print("UID tag: ");
        String content = "";
        byte letter;
        for (byte i = 0; i < mfrc522.uid.size; i++) {
          Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");
          Serial.print(mfrc522.uid.uidByte[i], HEX);
          content.concat(String(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " "));
          content.concat(String(mfrc522.uid.uidByte[i], HEX));
        }
        Serial.println();
        Serial.print("Message: ");
        content.toUpperCase();
        if (content.substring(1) == "9B 79 92 00") { // enter your own card number after copying it from serial monitor
          Serial.println("Authorized access");
          Serial.println();
          digitalWrite(LED_PIN, HIGH); // Turn on LED for authorized access
          delay(500);

          // Servo motor action
          for (int pos = 90; pos >= 0; pos -= 1) { // goes from 0 degrees to 180 degrees
            myservo.write(pos);              // tell servo to go to position in variable 'pos'
            delay(50);                       // waits 15ms for the servo to reach the position
          }
          for (int pos = 0; pos <= 90; pos += 1) { // goes from 180 degrees to 0 degrees
            myservo.write(pos);              // tell servo to go to position in variable 'pos'
            delay(50);                       // waits 15ms for the servo to reach the position
          }
          digitalWrite(LED_PIN, LOW); // Turn off LED after servo action
        } else {
          Serial.println("Access denied");
          digitalWrite(LED_PIN, LOW); // Turn off LED for denied access
          tone(BUZZER_PIN, 300);
          delay(1000);
          noTone(BUZZER_PIN);
        }
      }
    }
  } else if (useFingerprint) {
    if (!enrolled) {
      enrollFingerprint();
    } else {
      if (fingerDetected) {
        verifyFingerprint();
        delay(500);
      } else {
        detectFinger();
      }
    }
  }
}

void detectFinger() {
  int p = finger.getImage();
  if (p == FINGERPRINT_OK) {
    Serial.println("Finger detected!");
    fingerDetected = true;
  }
}

void enrollFingerprint() {
  Serial.println("Ready to enroll a fingerprint!");
  Serial.println("Please type in the ID # (from 1 to 127) you want to save this finger as...");
  uint8_t id = readnumber();
  if (id == 0) { // ID #0 not allowed, try again!
    return;
  }
  Serial.print("Enrolling ID #");
  Serial.println(id);

  while (!getFingerprintEnroll(id));
}

uint8_t getFingerprintEnroll(uint8_t id) {
  int p = -1;
  Serial.print("Waiting for valid finger to enroll as #"); Serial.println(id);
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK:
        Serial.println("Image taken");
        break;
      case FINGERPRINT_NOFINGER:
        Serial.print(".");
        break;
      case FINGERPRINT_PACKETRECIEVEERR:
        Serial.println("Communication error");
        break;
      case FINGERPRINT_IMAGEFAIL:
        Serial.println("Imaging error");
        break;
      default:
        Serial.println("Unknown error");
        break;
    }
  }

  // OK success!

  p = finger.image2Tz(1);
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image converted");
      break;
    case FINGERPRINT_IMAGEMESS:
      Serial.println("Image too messy");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_FEATUREFAIL:
      Serial.println("Could not find fingerprint features");
      return p;
    case FINGERPRINT_INVALIDIMAGE:
      Serial.println("Could not find fingerprint features");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }

  Serial.println("Remove finger");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
  }
  Serial.print("ID "); Serial.println(id);
  p = -1;
  Serial.println("Place same finger again");
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK:
        Serial.println("Image taken");
        break;
      case FINGERPRINT_NOFINGER:
        Serial.print(".");
        break;
      case FINGERPRINT_PACKETRECIEVEERR:
        Serial.println("Communication error");
        break;
      case FINGERPRINT_IMAGEFAIL:
        Serial.println("Imaging error");
        break;
      default:
        Serial.println("Unknown error");
        break;
    }
  }

  // OK success!

  p = finger.image2Tz(2);
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image converted");
      break;
    case FINGERPRINT_IMAGEMESS:
      Serial.println("Image too messy");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_FEATUREFAIL:
      Serial.println("Could not find fingerprint features");
      return p;
    case FINGERPRINT_INVALIDIMAGE:
      Serial.println("Could not find fingerprint features");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }

  // OK converted!
  Serial.print("Creating model for #");  Serial.println(id);

  p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println("Prints matched!");
    enrolled = true;
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    return p;
  } else if (p == FINGERPRINT_ENROLLMISMATCH) {
    Serial.println("Fingerprints did not match");
    return p;
  } else {
    Serial.println("Unknown error");
    return p;
  }

  Serial.print("ID "); Serial.println(id);
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("Stored!");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    return p;
  } else if (p == FINGERPRINT_BADLOCATION) {
    Serial.println("Could not store in that location");
    return p;
  } else if (p == FINGERPRINT_FLASHERR) {
    Serial.println("Error writing to flash");
    return p;
  } else {
    Serial.println("Unknown error");
    return p;
  }

  return true;
}

void verifyFingerprint() {
  int p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) {
    fingerDetected = false;
    Serial.println("Remove finger");
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    return;
  }

  Serial.println("Place the finger to verify...");
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    delay(100);
  }

  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
    Serial.println("Found fingerprint ID:");
    Serial.println(finger.fingerID);
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
    delay(2000);
    digitalWrite(LED_PIN, LOW);

    // Check if prints matched
    Serial.println("Prints matched!");
    digitalWrite(LED_PIN, HIGH); // Turn on LED

    // Servo motor action
    for (int pos = 90; pos >= 0; pos -= 1) { // goes from 0 degrees to 180 degrees
      myservo.write(pos);              // tell servo to go to position in variable 'pos'
      delay(50);                       // waits 15ms for the servo to reach the position
    }
    for (int pos = 0; pos <= 90; pos += 1) { // goes from 180 degrees to 0 degrees
      myservo.write(pos);              // tell servo to go to position in variable 'pos'
      delay(50);      
    }
  } else {
    Serial.println("Access denied");
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(2000);
    digitalWrite(BUZZER_PIN, LOW);
  }
}

uint8_t readnumber(void) {
  uint8_t num = 0;
  while (num == 0) {
    while (! Serial.available());
    num = Serial.parseInt();
  }
  return num;
}
