#include <ESP32Servo.h> // Memasukkan library ESP32Servo untuk mengontrol motor servo

// =========================================================================
// CONFIGURASI PIN (Mendefinisikan pin ESP32 yang terhubung ke komponen)
// =========================================================================
#define TRIG_PIN 5        // Pin GPIO 5 dihubungkan ke pin Trigger (Trig) sensor ultrasonik
#define ECHO_PIN 18       // Pin GPIO 18 dihubungkan ke pin Echo sensor ultrasonik
#define SERVO_PIN 19      // Pin GPIO 19 dihubungkan ke kabel data/sinyal (oranye) motor servo
#define LED_RED 25        // Pin GPIO 25 dihubungkan ke lampu Merah pada modul traffic lamp
#define LED_YELLOW 26     // Pin GPIO 26 dihubungkan ke lampu Kuning pada modul traffic lamp
#define LED_GREEN 27      // Pin GPIO 27 dihubungkan ke lampu Hijau pada modul traffic lamp
#define BUZZER_PIN 23     // Pin GPIO 23 dihubungkan ke kaki positif (+) buzzer speaker

Servo myServo;            // Membuat objek bernama 'myServo' berbasis class Servo untuk kontrol motor

void setup() {
  Serial.begin(115200);   // Membuka jalur komunikasi serial ke PC dengan kecepatan 115200 bps
  
  // Mengatur mode pin: OUTPUT untuk mengirim arus listrik, INPUT untuk membaca sinyal masukan
  pinMode(TRIG_PIN, OUTPUT);    // Pin Trig diset sebagai Output untuk memancarkan suara ultrasonik
  pinMode(ECHO_PIN, INPUT);     // Pin Echo diset sebagai Input untuk menangkap pantulan suara ultrasonik
  pinMode(LED_RED, OUTPUT);     // Pin LED Merah diset sebagai Output
  pinMode(LED_YELLOW, OUTPUT);  // Pin LED Kuning diset sebagai Output
  pinMode(LED_GREEN, OUTPUT);   // Pin LED Hijau diset sebagai Output
  pinMode(BUZZER_PIN, OUTPUT);  // Pin Buzzer diset sebagai Output
  
  myServo.attach(SERVO_PIN);    // Menyambungkan objek servo ke pin fisik (GPIO 19) yang sudah ditentukan
}

void loop() {
  // -----------------------------------------------------------------------
  // PERGERAKAN 1: Motor servo berputar maju dari sudut 0 ke 180 derajat
  // -----------------------------------------------------------------------
  for (int angle = 0; angle <= 180; angle += 1) { // Pergeseran sudut rapat (+1 derajat) agar gerakan mulus
    myServo.write(angle);                         // Memerintahkan servo bergerak ke posisi sudut saat ini
    delay(15);                                    // Jeda 15 milidetik agar motor sempat bergerak sebelum lanjut
    
    // Logika saringan: Hanya mengambil data jarak jika sudut bernilai genap (bisa dibagi 2)
    // Ini dilakukan agar sensor ultrasonik tidak bekerja terlalu keras yang bisa membuat servo tersendat
    if (angle % 2 == 0) {
      int distance = getDistance();               // Memanggil fungsi getDistance() untuk mendapatkan data jarak
      kendaliIndikator(distance);                 // Menyalakan lampu/buzzer yang sesuai dengan jarak objek
      cetakData(angle, distance);                 // Mengirim teks info sudut dan jarak ke Serial Monitor PC
    }
  }
  
  // -----------------------------------------------------------------------
  // PERGERAKAN 2: Motor servo berputar mundur kembali dari 180 ke 0 derajat
  // -----------------------------------------------------------------------
  for (int angle = 180; angle >= 0; angle -= 1) { // Pengurangan sudut dilakukan bertahap (-1 derajat)
    myServo.write(angle);                         // Menggerakkan servo ke posisi sudut mundur
    delay(15);                                    // Jeda pergerakan fisik motor
    
    if (angle % 2 == 0) {                         // Saringan pengecekan jarak di sudut genap
      int distance = getDistance();               // Mengukur jarak objek saat servo berputar balik
      kendaliIndikator(distance);                 // Memperbarui status traffic lamp & buzzer
      cetakData(angle, distance);                 // Menampilkan data terbaru ke Serial Monitor
    }
  }
}

// =========================================================================
// FUNGSI UNTUK MENGHITUNG JARAK OBJEK (MENGGUNAKAN SENSOR ULTRASONIK)
// =========================================================================
int getDistance() {
  // Memastikan pin Trig benar-benar mati (LOW) sesaat untuk membersihkan sisa sinyal lama
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Mengirimkan pulsa trigger berupa sinyal HIGH selama 10 mikrodetik
  // Sinyal ini memicu sensor untuk memancarkan 8 gelombang suara ultrasonik berfrekuensi 40 kHz
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW); // Mematikan kembali pin Trig setelah pulsa terkirim
  
  // pulseIn() berfungsi menghitung waktu (dalam mikrodetik) sejak pin Echo bernilai HIGH hingga kembali LOW.
  // Ditambahkan batas waktu (timeout) 30000 µs (30 ms) agar program tidak macet jika tidak ada objek sama sekali.
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); 
  
  // Rumus fisika menghitung jarak berdasarkan kecepatan suara di udara (0.034 cm/µs)
  // Dibagi 2 karena durasi waktu yang didapat mencakup perjalanan pergi (saat dikirim) dan pulang (saat memantul balik)
  int distance = duration * 0.034 / 2;
  
  return distance; // Mengembalikan hasil perhitungan berupa angka jarak (satuan cm) ke fungsi utama
}

// =========================================================================
// FUNGSI LOGIKA KENDALI TRAFFIC LAMP & BUZZER BERDASARKAN JARAK
// =========================================================================
void kendaliIndikator(int distance) {
  
  // KONDISI 1: Jarak terdeteksi antara 1 sampai 15 cm 🔴 [ZONA BAHAYA]
  if (distance > 0 && distance <= 15) {
    digitalWrite(LED_RED, HIGH);      // Menyalakan LED Merah
    digitalWrite(LED_YELLOW, LOW);    // Mematikan LED Kuning
    digitalWrite(LED_GREEN, LOW);     // Mematikan LED Hijau
    digitalWrite(BUZZER_PIN, HIGH);   // Menyalakan Buzzer (bunyi alarm tanpa putus)
  } 
  // KONDISI 2: Jarak terdeteksi antara 16 sampai 30 cm 🟡 [ZONA PERINGATAN]
  else if (distance > 15 && distance <= 30) {
    digitalWrite(LED_RED, LOW);       // Mematikan LED Merah
    digitalWrite(LED_YELLOW, HIGH);   // Menyalakan LED Kuning
    digitalWrite(LED_GREEN, LOW);     // Mematikan LED Hijau
    digitalWrite(BUZZER_PIN, LOW);    // Mematikan Buzzer
  } 
  // KONDISI 3: Jarak di atas 30 cm atau tidak mendeteksi apa pun 🟢 [ZONA AMAN]
  else {
    digitalWrite(LED_RED, LOW);       // Mematikan LED Merah
    digitalWrite(LED_YELLOW, LOW);    // Mematikan LED Kuning
    digitalWrite(LED_GREEN, HIGH);    // Menyalakan LED Hijau
    digitalWrite(BUZZER_PIN, LOW);    // Mematikan Buzzer
  }
}

// =========================================================================
// FUNGSI UNTUK MENGIRIM TEKS DATA KE SERIAL MONITOR PC
// =========================================================================
void cetakData(int angle, int distance) {
  Serial.print("Sudut: ");        // Mencetak teks statis "Sudut: "
  Serial.print(angle);            // Mencetak nilai angka posisi derajat servo saat ini
  Serial.print(" deg | Jarak: "); // Mencetak pembatas teks
  Serial.print(distance);         // Mencetak nilai angka hasil ukur jarak sensor ultrasonik
  Serial.println(" cm");          // Mencetak teks satuan " cm" sekaligus membuat baris baru (Enter)
}