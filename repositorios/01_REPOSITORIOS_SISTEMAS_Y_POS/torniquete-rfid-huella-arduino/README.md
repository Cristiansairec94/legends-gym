# Smart Lock System Using RFID and Fingerprint Sensors

This project implements a smart lock system using RFID and fingerprint sensors to control a servo motor, which simulates the locking and unlocking mechanism. The system includes an LED and a buzzer to provide visual and auditory feedback.

## Components Used

- Arduino
- RFID Reader (MFRC522)
- Fingerprint Sensor (Adafruit Fingerprint Sensor)
- Servo Motor
- LED
- Buzzer
- Jumper Wires
- Breadboard

## Libraries Required

Ensure you have the following libraries installed in your Arduino IDE:
- `Adafruit_Fingerprint`
- `MFRC522`
- `Servo`
- `SoftwareSerial`
- `SPI`

## Circuit Diagram

Connect the components as follows:

| Component | Pin |
|-----------|-----|
| LED | 5 |
| Buzzer | 7 |
| Fingerprint Sensor RX | 2 |
| Fingerprint Sensor TX | 3 |
| Servo Motor | 8 |
| RFID Reader SS | 10 |
| RFID Reader RST | 9 |

## Code

The code for this project is provided in the `FINAL_CODE.ino` file. The setup involves initializing the sensors and choosing between RFID and fingerprint mode via serial input. The loop function handles the authentication process for the chosen mode and controls the servo motor accordingly.

## Usage

1. **Upload the Code**: Upload the provided code to your Arduino board.
2. **Open Serial Monitor**: Open the Serial Monitor from the Arduino IDE.
3. **Choose Mode**: Enter '1' for RFID mode or '2' for Fingerprint mode.
4. **Authentication**:
   - For RFID mode: Present your RFID card to the reader.
   - For Fingerprint mode: Enroll and verify your fingerprint as prompted in the Serial Monitor.

## Fingerprint Enrollment

In fingerprint mode, you need to enroll fingerprints before they can be verified:
1. Follow the prompts in the Serial Monitor to enroll a new fingerprint.
2. Type in the ID number (from 1 to 127) for the fingerprint.
3. Place the same finger twice on the sensor for successful enrollment.

## Servo Motor Action

Upon successful authentication, the servo motor will move to unlock and lock positions, simulating the action of a lock.

## Feedback

- **LED**: Turns on for authorized access.
- **Buzzer**: Beeps for unauthorized access.

## Author

Rahul Yadav

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## Acknowledgments

- Adafruit Industries for the fingerprint sensor library and tutorials.
- Arduino community for the support and inspiration.

