<?php
/**
 * proxy.php — Server-side proxy untuk request ke ESP32
 * Menghindari masalah CORS saat browser fetch langsung ke ESP32
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store, no-cache');

// Validasi URL
if (empty($_GET['url'])) {
    http_response_code(400);
    echo json_encode(['error' => 'URL tidak diberikan']);
    exit;
}

$url = filter_var($_GET['url'], FILTER_VALIDATE_URL);
if (!$url) {
    http_response_code(400);
    echo json_encode(['error' => 'URL tidak valid']);
    exit;
}

// Hanya izinkan koneksi ke IP lokal / private (keamanan)
$host = parse_url($url, PHP_URL_HOST);
if (!preg_match('/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.0\.0\.1)/', $host)) {
    http_response_code(403);
    echo json_encode(['error' => 'Hanya IP lokal yang diizinkan']);
    exit;
}

// Fetch dari ESP32
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 2,
    CURLOPT_TIMEOUT        => 3,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTPHEADER     => ['Accept: application/json'],
]);

$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($body === false || $code === 0) {
    http_response_code(503);
    echo json_encode(['error' => 'ESP32 tidak dapat dijangkau', 'detail' => $err]);
    exit;
}

// Forward respons
http_response_code($code);
echo $body;