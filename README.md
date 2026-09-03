# Peta Digital & Sistem Informasi Spasial RW 03

Aplikasi Geographic Information System (GIS) dan pemetaan wilayah interaktif untuk **RW 03**, dilengkapi dengan visualisasi batas wilayah RT, titik pengurus rukun warga, serta integrasi pemantauan **CCTV Live Streaming real-time** langsung dari Network Video Recorder (NVR) lokal.

---

## ✨ Fitur Utama

- 🗺️ **Peta Digital Interaktif (Leaflet GIS)**:
  - Dukungan multi-layer basemap: *Esri World Imagery*, *Google Hybrid*, dan *OpenStreetMap*.
  - Dukungan *deep over-zooming* hingga level zoom 23 untuk detail gang dan pemukiman.
- 📐 **Batas Administratif RT (GeoJSON Polygons)**:
  - Batas wilayah RT 07, RT 08, dan RT 09 dengan kode warna khusus dan label tooltip permanen.
- 👤 **Titik Lokasi & Kontak Pengurus**:
  - Penanda domisili Ketua RW dan Ketua RT 07, 08, 09.
  - Tombol aksi cepat terintegrasi langsung ke WhatsApp pengurus terkait.
- 📹 **Live Streaming CCTV Real-Time**:
  - Pemantauan langsung 17 titik kamera CCTV pantau keamanan lingkungan RW 03.
  - Terkunci pada **Sub-channel (352p, Ringan & Cepat)** untuk menghemat kuota internet dan beban proses server/NVR.
  - **Privasi & Keamanan**: Informasi internal IP, port, dan URL RTSP NVR disembunyikan agar tidak mudah dieksploitasi pihak luar.
  - Mode *Fullscreen* dan tombol *Reload stream*.
  - Manajemen proses cerdas: FFmpeg otomatis berhenti saat modal streaming ditutup untuk menghemat resource CPU.
- 🔍 **Pencarian & Manajemen Layer Cepat**:
  - Drawer navigasi untuk memfilter layer aktif (Wilayah, CCTV, Pengurus).
  - Kolom pencarian instan nama RT, kamera, atau pengurus.
- 🎛️ **Visibilitas Layer Terkendali (JSON)**:
  - Aktifkan / sembunyikan seluruh kategori layer secara dinamis melalui file [`public/layers.json`](public/layers.json) (`"wilayah"`, `"cctv"`, `"pengurus"`: `true` / `false`).
  - Layer yang disetel `false` akan **disembunyikan sepenuhnya** dari peta, switch selector, tab kategori, dan beranda tanpa perlu rebuild aplikasi.

---

## 🛠️ Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 3 + Nitro Engine)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/)
- **GIS Engine**: [Leaflet](https://leafletjs.com/)
- **Media Engine**: [FFmpeg](https://ffmpeg.org/) (RTSP to Web Stream Converter)
- **Container**: [Docker](https://www.docker.com/) & Docker Compose

---

## 📐 Arsitektur Streaming CCTV

Browser web modern tidak mendukung protokol `rtsp://` secara bawaan, serta NVR lokal menghasilkan codec video `HEVC / H.265`. Oleh karena itu, server Nuxt Nitro bertindak sebagai jembatan *transmuxing*:

```text
┌────────────────────────────────┐        RTSP (TCP)        ┌───────────────────────────────┐
│   NVR / DVR CCTV Lingkungan    │ ───────────────────────> │      Nuxt Nitro Server        │
│        192.168.1.14:554        │ (rtsp://admin@...:554)   │   (Spawn FFmpeg on-demand)    │
└────────────────────────────────┘                          └───────────────┬───────────────┘
                                                                            │
                                                                 HTTP MPJPEG│(multipart/x-mixed-replace)
                                                                            ▼
                                                            ┌───────────────────────────────┐
                                                            │    Browser Klien / Warga      │
                                                            │  (/map -> CctvLiveModal.vue)  │
                                                            └───────────────────────────────┘
```

---

## ⚙️ Persyaratan Sistem & Deployment

Sebelum men-deploy aplikasi ini, perhatikan kebutuhan jaringan berikut:

1. **Akses Jaringan ke NVR**:
   - Server tempat aplikasi di-deploy **wajib berada di jaringan lokal (LAN) yang sama** dengan NVR (`192.168.1.14`), atau terhubung via VPN (Tailscale, WireGuard).
   - Port RTSP `554` harus terbuka dan dapat dijangkau dari host aplikasi.
2. **Kebutuhan Perangkat Lunak**:
   - Jika deploy langsung di OS: **Node.js 20+** dan paket **`ffmpeg`** terpasang.
   - Jika deploy menggunakan Docker: Hanya butuh **Docker** & **Docker Compose** (FFmpeg sudah terpasang otomatis di dalam container).
3. **Catatan Hosting Serverless (Vercel / Netlify / Cloudflare Pages)**:
   - Hosting serverless statis publik **tidak dapat mengakses IP lokal `192.168.1.14`** dan tidak dapat menjalankan proses streaming FFmpeg yang kontinu.
   - Disarankan menggunakan **Self-Hosted** (Mini PC, Raspberry Pi, Home Server, atau Local VM di kantor RW/wilayah).

---

## 🚀 Panduan Menjalankan (Development)

### 1. Prasyarat
Pastikan Node.js (v20+) dan FFmpeg terpasang di sistem Anda:
```bash
node -v
ffmpeg -version
```

### 2. Instalasi Dependensi
```bash
git clone git@github.com:strbagus/rw3-spatial-data.git
cd rw3-spatial-data
npm install
```

### 3. Konfigurasi Environment
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Sesuaikan alamat IP NVR jika berbeda:
```dotenv
PORT=3000
CCTV_NVR_HOST=192.168.1.14
CCTV_NVR_PORT=554
CCTV_NVR_USER=admin
CCTV_NVR_PASSWORD=
```

### 4. Jalankan Dev Server
```bash
npm run dev
```
Buka browser di: [http://localhost:3000/map](http://localhost:3000/map)

---

## 📦 Panduan Deployment (Production)

### Opsi 1: Docker Compose (Sangat Direkomendasikan)
Cara termudah dan paling andal. Image Docker menggunakan multi-stage build berbasis Alpine yang ringan (~200MB) dan sudah mengemas Node.js serta FFmpeg.

1. **Salin konfigurasi environment**:
   ```bash
   cp .env.example .env
   ```

2. **Jalankan container di latar belakang**:
   ```bash
   docker compose up -d --build
   ```

3. **Cek status container**:
   ```bash
   docker compose ps
   docker compose logs -f app
   ```

Aplikasi siap diakses di port `3000` (atau port yang disetel di `.env`).

---

### Opsi 2: Standalone Server (PM2 / Systemd)
Jika ingin menjalankan langsung di sistem host Linux:

1. **Build aplikasi untuk produksi**:
   ```bash
   npm run build
   ```

2. **Jalankan menggunakan PM2**:
   ```bash
   npm install -g pm2
   PORT=3000 pm2 start .output/server/index.mjs --name rw3-gis
   pm2 save
   pm2 startup
   ```

---

### Opsi 3: Akses Publik dari Luar Rumah (Cloudflare Tunnel)
Jika server berada di jaringan lokal RW (misal Mini PC di balai RW) dan ingin dibuka agar warga dapat mengakses dari internet tanpa port forwarding:

1. **Pasang `cloudflared`** di server lokal:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```

2. **Jalankan Quick Tunnel (atau hubungkan ke domain sendiri)**:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Cloudflare akan memberikan URL publik HTTPS yang aman (misal `https://rw3-gis.yourdomain.com`). Trafik dari publik akan dialihkan ke server lokal Anda dengan aman.

---

## 📋 Variabel Lingkungan (Environment Variables)

| Variabel | Tipe | Default | Deskripsi |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `3000` | Port listen server aplikasi |
| `NODE_ENV` | String | `production` | Mode environment (`production` / `development`) |
| `CCTV_NVR_HOST` | String | `192.168.1.14` | Alamat IP perangkat NVR/DVR di jaringan lokal |
| `CCTV_NVR_PORT` | Number | `554` | Port RTSP NVR |
| `CCTV_NVR_USER` | String | `admin` | Username login RTSP NVR |
| `CCTV_NVR_PASSWORD`| String | *kosong* | Password login RTSP NVR (jika ada) |
| `CCTV_RTSP_PATTERN`| String | `/avstream/channel={channel}/stream={stream}.sdp` | Pola path RTSP pada NVR |

---

## 📹 Pemetaan Channel CCTV

Aplikasi memetakan atribut `id` dari data GeoJSON ke channel NVR secara otomatis:

| ID Titik | Nama Kamera | Channel NVR | Format Stream |
| :--- | :--- | :--- | :--- |
| `D01` | Gapura - Ngulon | Channel 1 | Sub-channel (352p @ 15fps) |
| `D02` | Gapura - Ngetan | Channel 2 | Sub-channel (352p @ 15fps) |
| `D03` | Angkringan Pojok - Ngulon | Channel 3 | Sub-channel (352p @ 15fps) |
| `D04` | Angkringan Pojok - Ngalor | Channel 4 | Sub-channel (352p @ 15fps) |
| `D05` | Pertigaan YesYes - Ngidul | Channel 5 | Sub-channel (352p @ 15fps) |
| `D06` | RT9 1 - Ngidul | Channel 6 | Sub-channel (352p @ 15fps) |
| `D07` | RT9 2 - Ngalor | Channel 7 | Sub-channel (352p @ 15fps) |
| `D08` | RT9 3 - Ngulon1 | Channel 8 | Sub-channel (352p @ 15fps) |
| `D09` | Balai RK - Ngulon | Channel 9 | Sub-channel (352p @ 15fps) |
| `D10` | Nextdoor - Ngidul | Channel 10 | Sub-channel (352p @ 15fps) |
| `D11` | RT8 1 - Ngulon | Channel 11 | Sub-channel (352p @ 15fps) |
| `D12` | Waskito - Ngulon | Channel 12 | Sub-channel (352p @ 15fps) |
| `D13` | RT7 1 - Ngulon | Channel 13 | Sub-channel (352p @ 15fps) |
| `D14` | RT7 2 - Ngidul | Channel 14 | Sub-channel (352p @ 15fps) |
| `D15` | Cakruk Lama - Ngulon | Channel 15 | Sub-channel (352p @ 15fps) |
| `D16` | RT9 3 - Ngalor | Channel 16 | Sub-channel (352p @ 15fps) |
| `D17` | Titik Kumpul - Ngulon | Channel 17 | Sub-channel (352p @ 15fps) |

---

## 📄 Lisensi
Hak Cipta © 2026 Wilayah RW 03. Dikembangkan untuk transparansi dan ketertiban lingkungan warga.
