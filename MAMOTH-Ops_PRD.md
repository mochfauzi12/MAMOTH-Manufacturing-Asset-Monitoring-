# MAMOTH-Ops — Product Requirements Document
**Machine Maintenance & Operations Technology Hub**
**Version:** 2.0.0 | **Status:** Draft — Ready for Engineering Review
**Tanggal:** 2026-05-24 | **Author:** Product & Architecture Team
**Changelog:** v2.0.0 — Major revision: gap analysis, risk register, acceptance criteria, operational readiness, error taxonomy, multi-tenant prep, photo storage strategy, WebSocket scalability, missing API endpoints, testing strategy

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Goals](#2-problem-statement--goals)
3. [Stakeholders & User Personas](#3-stakeholders--user-personas)
4. [Assumptions & Constraints](#4-assumptions--constraints)
5. [Functional Requirements](#5-functional-requirements)
6. [Core Features](#6-core-features)
7. [User Flow & Journey](#7-user-flow--journey)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Backend Architecture](#9-backend-architecture)
10. [Database Schema](#10-database-schema)
11. [API Contracts](#11-api-contracts)
12. [Real-Time & Async Architecture](#12-real-time--async-architecture)
13. [Offline-First Strategy](#13-offline-first-strategy)
14. [Notification Blast Architecture](#14-notification-blast-architecture)
15. [File & Media Storage Strategy](#15-file--media-storage-strategy)
16. [Infrastructure & Containerization](#16-infrastruktur--containerization)
17. [Security & Compliance](#17-security--compliance)
18. [KPI & Success Metrics](#18-kpi--success-metrics)
19. [Non-Functional Requirements](#19-non-functional-requirements)
20. [Testing Strategy](#20-testing-strategy)
21. [Risk Register](#21-risk-register)
22. [Operational Readiness](#22-operational-readiness)
23. [Deployment Guide (DokPloy)](#23-deployment-guide-dokploy)
24. [Open Questions & Decisions](#24-open-questions--decisions)
25. [Appendix](#25-appendix)

---

## 1. Executive Summary

**MAMOTH-Ops** adalah platform digital manajemen perawatan mesin pabrik yang dirancang untuk mendigitalisasi alur kerja insiden dari lantai produksi hingga penyelesaian oleh teknisi lapangan. Sistem ini menggantikan proses manual berbasis kertas dan radio komunikasi dengan sebuah ekosistem digital yang terdiri dari:

- **Tablet App** (Operator): Form insiden offline-first di lantai produksi
- **Supervisor Dashboard** (Web): Panel real-time untuk triage, manajemen antrean, dan blast notifikasi
- **Teknisi PWA**: Penerima perintah kerja berbasis push notification dan interface update status

**Differensiasi utama MAMOTH-Ops** adalah kemampuan **blast notifikasi massal yang asinkron** dengan **ketahanan jaringan tinggi** — sistem tetap berfungsi penuh saat jaringan Wi-Fi pabrik mengalami gangguan, lalu melakukan rekonsiliasi otomatis saat koneksi pulih.

### 1.1 Scope v1.0

Platform ini mencakup tiga modul inti yang saling terintegrasi:

| Modul | Platform | Pengguna Utama |
|---|---|---|
| Incident Reporting | PWA (Tablet) | Operator Lantai Produksi |
| Dispatch Dashboard | Web App (Desktop) | Supervisor Ruang Kontrol |
| Work Order Receiver | PWA (Smartphone) | Teknisi Lapangan |

### 1.2 Ketergantungan Eksternal Kritis

| Dependensi | Dampak Jika Tidak Tersedia | Mitigation |
|---|---|---|
| Firebase Cloud Messaging (FCM) | Blast notifikasi gagal | Web Push API sebagai fallback |
| Wi-Fi Pabrik | Form operator tidak bisa sync | Offline-first IndexedDB |
| Internet Server | API tidak dapat diakses | Queue lokal di device |

---

## 2. Problem Statement & Goals

### 2.1 Masalah yang Dipecahkan

| Masalah Saat Ini | Dampak Terukur |
|---|---|
| Operator menulis insiden di kertas form | Kehilangan data, delay pelaporan rata-rata 15–45 menit |
| Supervisor menghubungi teknisi satu per satu via radio/telepon | Bottleneck koordinasi, MTTR tinggi |
| Tidak ada log audit perubahan status mesin | Tidak ada data untuk analisis performa dan KPI |
| Tidak ada visibilitas real-time status perbaikan | Supervisor tidak tahu progress tanpa menelepon |
| Gangguan Wi-Fi menghentikan seluruh alur kerja digital | Ketergantungan penuh pada jaringan |

**Catatan Analis:** Data "rata-rata 15–45 menit" dan target MTTR "turun 35%" perlu divalidasi dengan data historis aktual sebelum sprint 1. Jika data belum tersedia, lakukan observasi lapangan selama 2 minggu sebagai baseline.

### 2.2 Goals & Success Criteria

| ID | Goal | Metrik Sukses | Target | Cara Ukur |
|---|---|---|---|---|
| G1 | Kurangi waktu pelaporan insiden | Waktu submit form | < 2 menit dari deteksi masalah | Timer dari buka form → konfirmasi submit |
| G2 | Kurangi waktu dispatch teknisi | Waktu dari tiket PENDING → DISPATCHED | < 60 detik | Timestamp audit trail |
| G3 | Turunkan MTTR | Mean Time to Repair | Turun 35% dari baseline dalam 6 bulan | Rata-rata `resolved_at - created_at` |
| G4 | Zero data loss saat offline | Insiden yang hilang saat network down | 0 tiket hilang | Rekonsiliasi `localId` vs `serverUuid` |
| G5 | Audit trail komprehensif | Coverage perubahan status | 100% tiket memiliki complete audit trail | Query audit log vs total tiket |

### 2.3 Non-Goals (Out of Scope v1.0)

- Integrasi dengan ERP/SAP/MES
- Prediksi kerusakan mesin berbasis AI/ML
- Modul inventori suku cadang
- Aplikasi mobile native (iOS/Android) — v1.0 menggunakan PWA
- Single Sign-On (SSO) / Active Directory
- Modul jadwal preventive maintenance
- Integrasi billing / cost center

---

## 3. Stakeholders & User Personas

### 3.1 Stakeholder Map

| Stakeholder | Peran | Kepentingan | Tingkat Pengaruh |
|---|---|---|---|
| Plant Manager | Sponsor eksekutif | ROI, MTTR, kepatuhan | Tinggi |
| Kepala Maintenance | Product Owner lapangan | Efisiensi teknisi, KPI | Tinggi |
| IT Department | Integrasi infrastruktur | Keamanan, deployment | Sedang |
| Operator Lantai | End user | Kemudahan pelaporan | Tinggi |
| Supervisor | End user | Visibilitas real-time | Tinggi |
| Teknisi | End user | Kejelasan perintah kerja | Tinggi |

### 3.2 Persona: Budi — Operator Lantai Produksi

- **Perangkat**: Tablet Android 10" terpasang di stasiun produksi, shared device (bukan personal)
- **Konteks**: Lingkungan pabrik berisik, tangan bisa kotor atau memakai sarung tangan, koneksi Wi-Fi tidak stabil
- **Goal**: Laporkan insiden mesin secepat mungkin dengan minimal form-filling
- **Pain Point**: Form digital sebelumnya hilang data saat Wi-Fi putus; tidak tahu apakah laporan sudah terkirim
- **Kebutuhan Kritis**: Konfirmasi visual yang jelas bahwa data tersimpan meskipun offline
- **Tingkat Literasi Digital**: Menengah — familiar dengan smartphone tapi bukan pengguna teknis
- **Batasan Kritis**: Satu tablet digunakan bergantian oleh beberapa operator dalam shift yang sama

> **Implikasi Desain (Budi):** Login harus cepat (PIN atau scan badge), bukan password kompleks. Harus ada mekanisme "siapa yang melaporkan ini" meski login shared device.

### 3.3 Persona: Rina — Supervisor Ruang Kontrol

- **Perangkat**: Desktop/laptop dengan layar besar (≥ 24"), koneksi LAN stabil
- **Konteks**: Memantau 5–20 insiden aktif bersamaan, tekanan pengambilan keputusan cepat di shift sibuk
- **Goal**: Dispatch teknisi yang tepat ke mesin yang tepat dalam waktu minimal
- **Pain Point**: Harus menelepon teknisi satu per satu, tidak tahu siapa yang available atau sedang mengerjakan apa
- **Kebutuhan Kritis**: Blast notifikasi ke banyak teknisi sekaligus, visibility real-time tanpa refresh
- **Kebutuhan Tambahan**: Filter dan sort tiket cepat; sound alert untuk tiket CRITICAL baru

### 3.4 Persona: Agus — Teknisi Lapangan

- **Perangkat**: Smartphone Android (personal atau dinas), koneksi seluler (bisa masuk area blind spot Wi-Fi)
- **Konteks**: Berpindah-pindah area pabrik, sering di area berisik atau kurang cahaya, tidak selalu bisa pegang HP
- **Goal**: Terima perintah kerja dengan jelas, update status pekerjaan tanpa friksi
- **Pain Point**: Menerima informasi mesin rusak yang tidak lengkap atau terlambat
- **Kebutuhan Kritis**: Notifikasi instan dengan detail mesin dan lokasi yang presisi; aksi satu ketukan (Accept/In Progress/Done)

> **Implikasi Desain (Agus):** Notifikasi harus actionable langsung dari lock screen. Detail lokasi mesin (nama area + lantai + kode mesin) harus tampil lengkap di preview notifikasi, bukan hanya di dalam app.

---

## 4. Assumptions & Constraints

### 4.1 Asumsi Bisnis

| ID | Asumsi | Risiko Jika Salah |
|---|---|---|
| A-01 | Jumlah teknisi aktif per shift maksimum 50 orang | Blast throughput perlu di-redesign |
| A-02 | Jumlah tiket aktif bersamaan tidak melebihi 200 | Perlu pagination dan virtual scroll jika lebih |
| A-03 | Satu mesin dapat memiliki maksimum 1 insiden aktif pada waktu yang sama | Perlu business rule "blocking" atau allow multiple |
| A-04 | Foto insiden berukuran maksimum 5 MB per foto, max 3 foto per insiden | Perlu storage lifecycle policy |
| A-05 | Tablet operator terhubung ke jaringan Wi-Fi pabrik (bukan seluler) | Offline strategy berbeda untuk seluler |
| A-06 | Server di-deploy di server lokal pabrik atau VPS Indonesia | Latency dan regulasi data lokal |

### 4.2 Batasan Teknis

| ID | Batasan | Dampak |
|---|---|---|
| C-01 | Budget infrastruktur: single VPS (8 core, 16GB RAM) | Tidak bisa horizontal scaling awal |
| C-02 | Tim engineering: 2 backend + 1 frontend developer | Timeline realistis 4–5 bulan untuk v1.0 |
| C-03 | Tidak ada dedicated DevOps | Deployment manual via DokPloy |
| C-04 | Browser target: Chrome 90+ (Tablet), Chrome 90+ (Desktop), Chrome 90+ (Mobile) | Tidak perlu support Firefox/Safari untuk v1.0 |

---

## 5. Functional Requirements

### 5.1 Modul Operator (FR-OP)

| ID | Requirement | Prioritas | Acceptance Criteria |
|---|---|---|---|
| FR-OP-01 | Operator dapat mengisi form insiden: nama mesin (dari daftar/autocomplete), lokasi, jenis kerusakan, tingkat urgensi, deskripsi, foto (opsional, max 3) | Must Have | Form dapat disubmit dalam < 2 menit untuk insiden standar |
| FR-OP-02 | Form tersimpan ke IndexedDB secara otomatis saat submit jika offline | Must Have | Data tidak hilang saat browser di-refresh setelah submit offline |
| FR-OP-03 | Indikator status offline/online terlihat jelas di UI (banner + ikon) | Must Have | Banner muncul dalam < 1 detik setelah koneksi terputus |
| FR-OP-04 | Sinkronisasi otomatis bulk ke server saat koneksi pulih tanpa intervensi user | Must Have | Sync dimulai dalam < 5 detik setelah event `online` terdeteksi |
| FR-OP-05 | Konfirmasi visual (toast/badge) saat data berhasil tersinkronisasi | Must Have | Toast menampilkan jumlah tiket yang berhasil sync |
| FR-OP-06 | Operator dapat melihat riwayat 10 insiden terakhir yang pernah dilaporkan (dari device ini) | Should Have | Tampil meski offline (dari IndexedDB) |
| FR-OP-07 | Form mendukung input dengan sarung tangan (tap target ≥ 48px, spacing antar elemen ≥ 8px) | Should Have | Dapat dioperasikan 100% dengan jari telunjuk bersarung tangan |
| FR-OP-08 | Auto-save draft setiap 30 detik selama pengisian form | Should Have | Draft tetap ada setelah browser crash atau tab tertutup tidak sengaja |
| FR-OP-09 | **[BARU]** Operator harus memilih identitas diri (login PIN atau pilih nama dari daftar shift) sebelum submit | Must Have | Setiap tiket memiliki `reported_by` yang valid dan spesifik |
| FR-OP-10 | **[BARU]** Form memiliki field "mesin tidak ditemukan di daftar" dengan input manual | Should Have | Menghindari hambatan jika master data mesin belum lengkap |
| FR-OP-11 | **[BARU]** Jika ada insiden aktif untuk mesin yang sama, sistem menampilkan peringatan sebelum submit | Must Have | Mencegah duplikasi tiket untuk mesin yang sama |

### 5.2 Modul Supervisor (FR-SV)

| ID | Requirement | Prioritas | Acceptance Criteria |
|---|---|---|---|
| FR-SV-01 | Dashboard menampilkan semua tiket aktif dalam bentuk card/tabel dengan status real-time | Must Have | Tiket baru muncul dalam < 2 detik setelah operator submit |
| FR-SV-02 | Supervisor dapat memilih multiple tiket sekaligus (checkbox multi-select) | Must Have | Bisa pilih semua dengan "Select All" dan deselect individual |
| FR-SV-03 | Tombol "Blast Perintah Kerja" memicu notifikasi massal ke semua teknisi standby | Must Have | Blast selesai (semua terkirim) dalam < 15 detik untuk 50 teknisi |
| FR-SV-04 | Dashboard diperbarui real-time via WebSocket tanpa refresh halaman | Must Have | Koneksi WS auto-reconnect dengan exponential backoff; status indikator terlihat |
| FR-SV-05 | Log audit menampilkan seluruh riwayat perubahan status setiap tiket | Must Have | Setiap entry audit mencantumkan: siapa, apa, kapan |
| FR-SV-06 | Filter tiket: status, mesin, area, urgensi, tanggal, teknisi yang assigned | Should Have | Filter bisa dikombinasikan, hasil update real-time |
| FR-SV-07 | Supervisor dapat meng-assign tiket ke teknisi spesifik | Should Have | Assignment tercatat di audit log; teknisi menerima notifikasi personal |
| FR-SV-08 | Dashboard menampilkan KPI ringkasan: tiket aktif, MTTR rata-rata hari ini, teknisi online/standby/on-duty | Should Have | Data KPI refresh setiap 60 detik atau saat ada event |
| FR-SV-09 | Supervisor dapat menutup/resolve tiket dengan catatan penyelesaian wajib | Must Have | Resolusi tanpa catatan tidak bisa di-submit |
| FR-SV-10 | Notifikasi in-app saat tiket CRITICAL baru masuk (sound + visual flash) | Should Have | Sound dapat dimatikan di settings per-user |
| FR-SV-11 | **[BARU]** Supervisor dapat membatalkan tiket dengan alasan pembatalan | Must Have | Tiket CANCELLED tidak dapat di-blast ulang |
| FR-SV-12 | **[BARU]** Supervisor dapat melihat status blast secara real-time: berapa teknisi sudah terima, berapa gagal | Must Have | Progress bar dan detail per-teknisi tampil selama blast berlangsung |
| FR-SV-13 | **[BARU]** Supervisor dapat export laporan tiket per periode (harian/mingguan) ke CSV | Should Have | Export berjalan asinkron; file siap dalam < 30 detik untuk < 1000 tiket |

### 5.3 Modul Teknisi (FR-TK)

| ID | Requirement | Prioritas | Acceptance Criteria |
|---|---|---|---|
| FR-TK-01 | Teknisi menerima push notification di perangkat saat di-blast | Must Have | Notifikasi muncul di lock screen bahkan saat PWA tidak aktif |
| FR-TK-02 | Teknisi dapat mengubah status tiket: Accept → In Progress → Resolved | Must Have | Setiap transisi status mencatat timestamp dan user_id |
| FR-TK-03 | Notifikasi berisi: ID tiket, nama mesin, kode lokasi, deskripsi singkat, urgensi | Must Have | Semua info kritis tampil di preview notifikasi tanpa buka app |
| FR-TK-04 | Teknisi dapat menambahkan catatan dan foto saat update status (terutama saat Resolve) | Should Have | Foto opsional; catatan wajib saat resolve dengan urgensi HIGH/CRITICAL |
| FR-TK-05 | Riwayat perintah kerja yang pernah diterima (30 hari terakhir) | Should Have | Tampil bahkan saat offline (dari cache lokal) |
| FR-TK-06 | **[BARU]** Teknisi dapat update status ketersediaan: STANDBY / ON_DUTY / OFF_DUTY | Must Have | Status tercermin real-time di dashboard supervisor |
| FR-TK-07 | **[BARU]** Teknisi dapat menolak perintah kerja dengan alasan (misal: sedang ON_DUTY lain) | Should Have | Penolakan tercatat di audit trail; supervisor mendapat notifikasi |
| FR-TK-08 | **[BARU]** Teknisi mendapat konfirmasi bahwa supervisor sudah melihat update status mereka | Could Have | "Seen" indicator pada status update |

### 5.4 Modul Audit & Reporting (FR-AU)

| ID | Requirement | Prioritas | Acceptance Criteria |
|---|---|---|---|
| FR-AU-01 | Setiap perubahan status tiket tercatat di tabel audit_trail dengan timestamp microsecond dan user_id | Must Have | Tidak ada state transition tanpa audit entry |
| FR-AU-02 | MTTR dihitung otomatis per tiket: waktu dari `created_at` (PENDING) → `resolved_at` (RESOLVED) | Must Have | MTTR tersimpan sebagai field terkomputasi, bukan hanya dihitung runtime |
| FR-AU-03 | Report harian/mingguan dapat diekspor (CSV) | Should Have | Format CSV kompatibel dengan Excel Indonesia (delimiter: semicolon, encoding: UTF-8 BOM) |
| FR-AU-04 | Leaderboard performa teknisi: total tiket resolved, rata-rata MTTR, acceptance rate blast | Could Have | Data agregasi per bulan, dapat di-filter per area |
| FR-AU-05 | **[BARU]** Admin dapat melihat log aktivitas sistem: login, blast history, export history | Must Have | Diperlukan untuk audit compliance |

### 5.5 Modul Admin (FR-AD) — [BARU]

| ID | Requirement | Prioritas | Acceptance Criteria |
|---|---|---|---|
| FR-AD-01 | Admin dapat menambah/edit/nonaktifkan User (semua role) | Must Have | Nonaktifkan user tidak menghapus data historis |
| FR-AD-02 | Admin dapat mengelola master data Mesin (tambah, edit, nonaktifkan) | Must Have | Mesin nonaktif tidak muncul di dropdown operator |
| FR-AD-03 | Admin dapat melihat semua tiket dari semua area | Must Have | — |
| FR-AD-04 | Admin dapat reset push subscription teknisi yang bermasalah | Should Have | Berguna saat teknisi ganti HP |
| FR-AD-05 | **[BARU]** Admin dapat mengkonfigurasi: kategori jenis kerusakan, area pabrik, shift schedule | Should Have | Konfigurasi tanpa perlu deploy ulang |

---

## 6. Core Features

### Feature 1: Offline-First Incident Form

Form input insiden yang berfungsi 100% tanpa koneksi internet. Menggunakan IndexedDB via Dexie.js sebagai local database browser. Service Worker meregistrasikan Background Sync task yang akan memproses antrian sinkronisasi secara otomatis.

**Mekanisme:**
1. User submit form → data ditulis ke IndexedDB dengan status `pending_sync`
2. Service Worker mendengarkan event `online`
3. Background Sync API men-trigger job `sync-incidents`
4. Semua record `pending_sync` dikirim ke `POST /api/v1/incidents/sync` dalam satu bulk request
5. Server membalas dengan `serverUuid` untuk setiap `localId`
6. Record di IndexedDB diupdate status → `synced`
7. UI tab menerima postMessage `SYNC_COMPLETE` dan menampilkan toast

**Edge Cases yang Harus Ditangani:**
- Sync sebagian berhasil, sebagian gagal → response `207 Multi-Status` dengan detail per localId
- Server menolak karena duplikat (localId sudah ada) → update IndexedDB ke `synced` dengan serverUuid yang ada
- Sync gagal setelah 3 retry → status `sync_failed`, tampilkan error di UI dengan tombol "Coba Lagi Manual"
- Foto terlalu besar → kompres di sisi klien sebelum simpan ke IndexedDB (max 1MB per foto setelah kompresi)

### Feature 2: Real-Time Supervisor Dashboard

Dashboard yang menampilkan status semua tiket secara live menggunakan WebSocket connection ke backend. Setiap mutasi data di backend langsung di-broadcast ke semua supervisor yang sedang online.

**Mekanisme:**
1. Frontend membuka WebSocket ke `/ws/supervisor?token=<jwt>`
2. Backend FastAPI `ConnectionManager` mengelola connection pool (user_id → Set[WebSocket] untuk multi-tab)
3. Setiap mutasi tiket (create/update/resolve) → backend broadcast `IncidentUpdateEvent`
4. Frontend React memperbarui state lokal via Zustand tanpa re-fetch
5. Heartbeat PING/PONG setiap 30 detik untuk deteksi koneksi mati (timeout 90 detik tanpa PONG = disconnect)

**Scalability Note (v1.0):** ConnectionManager disimpan in-memory. Jika di masa depan ada multiple backend instance, wajib migrasi ke Redis Pub/Sub untuk broadcast antar-instance.

### Feature 3: Blast Notifikasi Massal Asinkron

Fitur inti MAMOTH-Ops. Supervisor memilih N tiket → klik "Blast" → sistem mengirim perintah kerja ke semua teknisi standby secara massal tanpa memblokir API server.

**Mekanisme:**
1. `POST /api/v1/incidents/dispatch-blast` diterima FastAPI
2. Validasi: role, rate limit, incident_ids valid, ada teknisi standby
3. Tiket diupdate status → `DISPATCHED_MASSAL`, `dispatched_at` diisi
4. BlastJob record dibuat di DB dengan status `QUEUED`
5. Job dikirim ke **Redis Queue** (ARQ)
6. API response langsung `202 Accepted` (tidak menunggu loop selesai)
7. ARQ Worker: loop per teknisi, kirim push via FCM/WebPush, throttle 50ms antar kiriman
8. Setiap 10% progress → broadcast `BLAST_PROGRESS` ke supervisor via WebSocket
9. Selesai → broadcast `BLAST_COMPLETED`, update BlastJob record

**Fallback Push:** Jika FCM gagal untuk teknisi tertentu, coba Web Push VAPID. Jika keduanya gagal, catat di `blast_delivery_log` sebagai `FAILED` dengan error detail.

### Feature 4: KPI & Audit Trail

Setiap event pada lifecycle tiket dicatat di tabel `incident_audit_log` dengan presisi microsecond. MTTR dihitung dari selisih `created_at` (PENDING) dan `resolved_at` (RESOLVED). Dashboard KPI menampilkan agregasi data ini secara real-time.

**KPI yang Dihitung Real-Time:**
- Tiket aktif per status
- MTTR rata-rata hari ini vs kemarin
- Jumlah teknisi per status (STANDBY/ON_DUTY/OFF_DUTY/OFFLINE)
- Blast delivery rate (N jam terakhir)

---

## 7. User Flow & Journey

### 7.1 Flow: Operator Melaporkan Insiden (Online)

```
[Operator membuka tablet]
        │
        ▼
[Login: PIN / Pilih nama dari daftar shift] ← BARU
        │
        ▼
[Halaman Form Insiden - Status: ONLINE ✅]
        │
[Isi: Nama Mesin (autocomplete), Lokasi, Jenis Kerusakan, Urgensi, Deskripsi, Foto (opsional)]
        │
        │── [Mesin sudah ada insiden aktif? → Warning Dialog] ← BARU
        │
        ▼
[Klik SUBMIT]
        │
        ▼
[IndexedDB ← data disimpan lokal (status: pending_sync)]
        │
        ▼
[Background Sync → POST /api/v1/incidents/sync]
        │
        ▼
[Server menyimpan ke PostgreSQL]
        │
        ├─── [Response: {serverUuid, localId, ticketNumber}]
        │
        ▼
[IndexedDB diupdate (status: synced)]
        │
        ▼
[Toast: "✅ Insiden #INC-2026-00042 berhasil dilaporkan"]
        │
        ▼
[WebSocket BROADCAST ke semua Supervisor Dashboard yang aktif]
```

### 7.2 Flow: Operator Melaporkan Insiden (Offline)

```
[Operator membuka tablet]
        │
        ▼
[Login (cached session masih valid)] ← Perhatikan: session harus persisten offline
        │
        ▼
[Halaman Form Insiden - Banner Merah: "⚠️ Mode Offline - Data disimpan lokal"]
        │
[Isi form + Submit]
        │
        ▼
[IndexedDB ← data disimpan (status: pending_sync)]
        │
        ▼
[Toast: "📱 Tersimpan offline. Akan dikirim saat online kembali."]
        │
        ▼
[... waktu berlalu, Wi-Fi pulih ...]
        │
        ▼
[Service Worker mendeteksi event: online]
        │
        ▼
[Background Sync trigger: 'sync-incidents']
        │
        ▼
[Bulk POST /api/v1/incidents/sync dengan semua pending records]
        │
        ▼
[Toast: "🔄 3 insiden berhasil tersinkronisasi!"]
        │
        ▼
[WebSocket BROADCAST ke Supervisor untuk setiap tiket yang baru masuk]
```

### 7.3 Flow: Supervisor Melakukan Blast Notifikasi

```
[Supervisor membuka Dashboard]
        │
        ▼
[WebSocket terhubung → Tiket masuk real-time (dengan sound alert untuk CRITICAL)]
        │
[List tiket dengan status PENDING_DISPATCH, diurutkan: CRITICAL → HIGH → MEDIUM → LOW]
        │
[Supervisor mencentang 5 tiket yang perlu didispatch]
        │
        ▼
[Klik: "🚀 Blast Perintah Kerja (5 tiket)"]
        │
        ▼
[Modal konfirmasi: "Kirim ke N teknisi standby? Spesialisasi: semua / filter"]
        │
        ▼
[POST /api/v1/incidents/dispatch-blast → 202 Accepted]
        │
        ▼
[Status tiket → DISPATCHED_MASSAL (real-time via WebSocket)]
        │
        ▼
[Progress panel muncul: "Mengirim ke 12 teknisi... [■■■□□□□□□□] 30%"]
        │
[Teknisi 1: ✅ Terkirim]
[Teknisi 2: ✅ Terkirim]
[Teknisi 3: ⚠️ Gagal - subscription expired]
        │
        ▼
[Panel selesai: "Blast selesai: 11 berhasil, 1 gagal. Lihat detail."]
        │
        ▼
[Audit log otomatis tercatat]
```

### 7.4 Flow: Teknisi Menerima & Update Perintah Kerja

```
[Teknisi menerima push notification (bahkan di lock screen)]
[Judul: "⚙️ Perintah Kerja — Extruder A3 KRITIS"]
[Isi: "Lantai 2, Zona B. 3 insiden menunggu. Oleh: Rina S."]
        │
        ├─── [Action button langsung: "✅ Terima" (tanpa buka app)]
        │
        ▼
[Klik notifikasi → PWA halaman detail tiket / daftar blast]
        │
        ▼
[Klik: "Terima Perintah Kerja"]
        │
[Status → UNDER_REPAIR + timestamp accepted_at + status teknisi → ON_DUTY]
        │
        ▼
[Teknisi melakukan perbaikan]
        │
        ▼
[Update: "Selesai" + catatan wajib (jika CRITICAL/HIGH) + foto opsional]
        │
[Status → RESOLVED + timestamp resolved_at + status teknisi → STANDBY]
        │
        ▼
[MTTR dihitung: resolved_at - created_at]
[Supervisor Dashboard diperbarui real-time via WebSocket]
```

---

## 8. Frontend Architecture

### 8.1 Tech Stack Frontend

```
React 18 + Vite 5 + TypeScript 5
├── UI Framework:       Tailwind CSS v3 (utility-first)
├── State Management:   Zustand v4 (ringan, real-time state)
├── Offline Storage:    Dexie.js v3 (IndexedDB wrapper)
├── WebSocket Client:   Native WebSocket API + custom hook (exponential backoff reconnect)
├── Service Worker:     Workbox v7 (via vite-plugin-pwa)
├── Push Notification:  Firebase Cloud Messaging (FCM) / Web Push API (VAPID fallback)
├── Form Management:    React Hook Form + Zod (runtime validation)
├── HTTP Client:        Axios + interceptor retry (3x dengan exponential backoff)
├── UI Components:      shadcn/ui (Radix UI + Tailwind)
├── Image Handling:     browser-image-compression (kompresi sebelum simpan IndexedDB)
└── Icons:              Lucide React
```

### 8.2 Strategi Routing & Layout

```
/                       → Redirect ke /dashboard (jika supervisor) atau /report (jika operator)
/login                  → Halaman login
/report                 → [OPERATOR] Form laporan insiden
/report/history         → [OPERATOR] Riwayat laporan
/dashboard              → [SUPERVISOR] Dashboard real-time
/dashboard/audit        → [SUPERVISOR] Log audit global
/dashboard/kpi          → [SUPERVISOR] Laporan KPI
/technician             → [TECHNICIAN] Daftar perintah kerja
/technician/incident/:id → [TECHNICIAN] Detail tiket
/admin                  → [ADMIN] Panel admin
/admin/users            → [ADMIN] Manajemen user
/admin/machines         → [ADMIN] Master data mesin
```

### 8.3 Struktur Direktori Frontend

```
frontend/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx              # Protected routes per role
│   └── providers.tsx           # Global: QueryClient, Zustand, WSProvider
│
├── features/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── useAuth.ts
│   │   └── PinLogin.tsx        # Login PIN untuk tablet shared
│   │
│   ├── incidents/
│   │   ├── IncidentForm.tsx    # Form operator
│   │   ├── IncidentHistory.tsx # Riwayat 10 terakhir
│   │   ├── IncidentCard.tsx    # Card komponen tiket
│   │   ├── IncidentDetail.tsx  # Detail tiket + audit log
│   │   └── useIncidentSync.ts  # Hook sinkronisasi offline
│   │
│   ├── blast/
│   │   ├── BlastPanel.tsx      # Seleksi tiket + trigger blast
│   │   ├── BlastProgress.tsx   # Real-time progress modal
│   │   └── useBlast.ts         # Hook blast logic + WS listener
│   │
│   ├── dashboard/
│   │   ├── SupervisorDashboard.tsx
│   │   ├── TicketList.tsx      # List dengan virtual scroll
│   │   ├── TicketFilters.tsx
│   │   ├── KPIWidget.tsx
│   │   └── AuditLogPanel.tsx
│   │
│   ├── technician/
│   │   ├── TechnicianDashboard.tsx
│   │   ├── WorkOrderCard.tsx
│   │   ├── StatusUpdater.tsx
│   │   └── AvailabilityToggle.tsx
│   │
│   └── admin/
│       ├── UserManagement.tsx
│       └── MachineManagement.tsx
│
├── lib/
│   ├── db/
│   │   ├── dexie.ts            # MamothDB instance
│   │   └── schema.ts           # IndexedDB schema + migrations
│   ├── websocket/
│   │   ├── WSClient.ts         # Singleton + reconnect logic
│   │   └── useWebSocket.ts     # React hook
│   ├── api/
│   │   ├── client.ts           # Axios instance + interceptors
│   │   └── endpoints.ts        # API URL constants
│   ├── fcm/
│   │   └── firebase.ts         # FCM init + token management
│   └── image/
│       └── compress.ts         # Image compression before IndexedDB store
│
├── store/
│   ├── authStore.ts            # User session, JWT
│   ├── incidentStore.ts        # Zustand incident state (upsert pattern)
│   ├── uiStore.ts              # offline banner, WS status, alerts
│   └── blastStore.ts           # Blast progress state
│
├── service-worker/
│   ├── sw.ts                   # SW utama (Workbox)
│   ├── backgroundSync.ts       # Background Sync handler
│   └── pushHandler.ts          # Push notification handler
│
└── types/
    ├── incident.types.ts
    ├── technician.types.ts
    ├── blast.types.ts
    └── api.types.ts
```

### 8.4 Dexie.js — IndexedDB Schema

```typescript
// src/lib/db/dexie.ts

import Dexie, { Table } from 'dexie';

export interface LocalIncident {
  id?: number;                    // Auto-increment PK (IndexedDB)
  localId: string;                // UUID v4 generated di browser
  serverUuid?: string;            // Diisi setelah sync berhasil
  ticketNumber?: string;          // INC-2026-00042, diisi dari server
  machineId: string;
  machineName: string;
  location: string;
  incidentType: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reportedBy: string;             // Operator user_id
  photos?: string[];              // Array base64 (max 3, sudah dikompresi)
  syncStatus: 'pending_sync' | 'syncing' | 'synced' | 'sync_failed';
  createdAt: Date;
  syncedAt?: Date;
  retryCount: number;             // Max retry: 3
  lastError?: string;
}

export interface LocalDraft {
  id?: number;
  draftId: string;
  formData: Partial<LocalIncident>;
  savedAt: Date;
}

class MamothDB extends Dexie {
  incidents!: Table<LocalIncident>;
  drafts!: Table<LocalDraft>;

  constructor() {
    super('MamothOpsDB');
    this.version(1).stores({
      incidents: '++id, localId, serverUuid, syncStatus, urgency, createdAt',
      drafts:    '++id, draftId, savedAt'
    });
  }
}

export const db = new MamothDB();
```

### 8.5 WebSocket Client (Reconnect + Heartbeat)

```typescript
// src/lib/websocket/WSClient.ts

const WS_BASE = import.meta.env.VITE_WS_URL;
const HEARTBEAT_INTERVAL = 30_000;  // 30 detik
const HEARTBEAT_TIMEOUT  = 90_000;  // 90 detik tanpa PONG = disconnect

export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1_000;
  private readonly maxReconnectDelay = 30_000;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private pongTimer?: ReturnType<typeof setTimeout>;
  private handlers = new Map<string, Set<(payload: unknown) => void>>();

  constructor(private token: string) {}

  connect() {
    this.ws = new WebSocket(`${WS_BASE}/ws/supervisor?token=${this.token}`);
    this.ws.onopen    = () => this.onOpen();
    this.ws.onmessage = (e) => this.onMessage(e);
    this.ws.onclose   = () => this.onClose();
  }

  private onOpen() {
    this.reconnectDelay = 1_000; // Reset
    this.startHeartbeat();
    this.emit('connected', {});
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.ws?.send(JSON.stringify({ type: 'PING' }));
      this.pongTimer = setTimeout(() => {
        this.ws?.close(); // Force disconnect jika tidak ada PONG
      }, HEARTBEAT_TIMEOUT - HEARTBEAT_INTERVAL);
    }, HEARTBEAT_INTERVAL);
  }

  private onMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data);
    if (msg.type === 'PONG') {
      clearTimeout(this.pongTimer);
      return;
    }
    this.emit(msg.type, msg.payload);
  }

  private onClose() {
    clearInterval(this.heartbeatTimer);
    this.emit('disconnected', {});
    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  on(event: string, handler: (payload: unknown) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  private emit(event: string, payload: unknown) {
    this.handlers.get(event)?.forEach(h => h(payload));
  }

  disconnect() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.pongTimer);
    this.ws?.close();
  }
}
```

---

## 9. Backend Architecture

### 9.1 Tech Stack Backend

```
FastAPI 0.111 + Python 3.12
├── Async Engine:    asyncio (native FastAPI)
├── ORM:             Prisma Client Python (prisma-client-py)
├── Database:        PostgreSQL 16
├── Cache/Queue:     Redis 7 (via ARQ — Async Redis Queue)
├── WebSocket:       FastAPI WebSocketRouter + ConnectionManager (in-memory, single instance v1.0)
├── Auth:            JWT (python-jose) + OAuth2PasswordBearer + bcrypt cost 12
├── Push:            FCM (firebase-admin-sdk) + Web Push (pywebpush) sebagai fallback
├── Validation:      Pydantic v2
├── Logging:         structlog (JSON structured, request_id di setiap log entry)
├── File Upload:     MinIO-compatible storage atau local volume (lihat Seksi 15)
└── Testing:         pytest-asyncio + httpx + factory_boy
```

### 9.2 Struktur Direktori Backend

```
backend/app/
├── main.py                    # FastAPI app + lifespan
├── config.py                  # Settings via pydantic-settings
│
├── api/
│   ├── v1/
│   │   ├── router.py          # APIRouter aggregator
│   │   ├── incidents.py       # Incident CRUD + sync + blast
│   │   ├── technicians.py     # Teknisi management + availability
│   │   ├── machines.py        # Master data mesin
│   │   ├── audit.py           # Audit log endpoints
│   │   ├── dashboard.py       # KPI + summary endpoints
│   │   ├── reports.py         # Export CSV/report [BARU]
│   │   ├── admin.py           # User & config management [BARU]
│   │   └── auth.py            # Login, token refresh, logout
│   │
│   └── websocket/
│       ├── router.py          # WS endpoints
│       └── manager.py         # ConnectionManager
│
├── core/
│   ├── security.py            # JWT utilities
│   ├── dependencies.py        # Shared FastAPI dependencies
│   ├── exceptions.py          # Custom exception handlers + error taxonomy
│   └── middleware.py          # CORS, request_id injection, timing, logging
│
├── services/
│   ├── incident_service.py    # Business logic insiden
│   ├── blast_service.py       # Blast notification logic
│   ├── push_service.py        # FCM + WebPush sender (dengan fallback)
│   ├── audit_service.py       # Audit trail writer
│   ├── kpi_service.py         # KPI aggregation [BARU]
│   └── report_service.py      # CSV export logic [BARU]
│
├── workers/
│   ├── arq_worker.py          # ARQ worker entry point
│   └── tasks/
│       ├── blast_task.py      # Task: blast notification loop
│       └── report_task.py     # Task: async CSV export [BARU]
│
├── schemas/
│   ├── incident.py
│   ├── blast.py
│   ├── technician.py
│   ├── machine.py
│   ├── user.py
│   ├── report.py              # [BARU]
│   └── common.py
│
└── scripts/
    └── create_superuser.py    # Seeder admin pertama
```

### 9.3 Error Taxonomy & Standard Response

Semua API response menggunakan format standar:

```json
// Success
{
  "status": "success",
  "data": { ... },
  "meta": {
    "requestId": "req_uuid",
    "timestamp": "2026-05-24T14:32:07.221Z"
  }
}

// Error
{
  "status": "error",
  "error": {
    "code": "MACHINE_ERROR_CODE",
    "message": "Pesan yang aman ditampilkan ke user",
    "details": { ... }  // Opsional, untuk debugging
  },
  "meta": {
    "requestId": "req_uuid",
    "timestamp": "2026-05-24T14:32:07.221Z"
  }
}
```

**Error Code Registry:**

| HTTP | Kode Error | Deskripsi |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak valid (include field details) |
| 400 | `EMPTY_PAYLOAD` | Request body kosong atau field wajib kosong |
| 400 | `PAYLOAD_TOO_LARGE` | Melebihi batas ukuran (incidents per sync, file upload) |
| 400 | `DUPLICATE_ACTIVE_INCIDENT` | Mesin sudah punya insiden aktif |
| 400 | `NO_STANDBY_TECHNICIANS` | Tidak ada teknisi standby untuk di-blast |
| 400 | `NO_DISPATCHABLE_INCIDENTS` | Semua insiden yang dipilih sudah di-dispatch |
| 400 | `INVALID_STATE_TRANSITION` | Transisi status tidak valid (misal: RESOLVED → PENDING) |
| 401 | `UNAUTHORIZED` | Token tidak ada atau expired |
| 401 | `INVALID_CREDENTIALS` | Login gagal |
| 403 | `FORBIDDEN` | Role tidak memiliki akses ke resource/action ini |
| 404 | `INCIDENT_NOT_FOUND` | Tiket tidak ditemukan |
| 404 | `MACHINE_NOT_FOUND` | Mesin tidak ditemukan |
| 404 | `USER_NOT_FOUND` | User tidak ditemukan |
| 409 | `BLAST_ALREADY_IN_PROGRESS` | Ada blast job yang sedang berjalan |
| 409 | `DUPLICATE_LOCAL_ID` | localId sudah pernah disync (idempotent, kembalikan existing) |
| 429 | `RATE_LIMITED` | Terlalu banyak request (include retry-after header) |
| 500 | `INTERNAL_ERROR` | Error internal server (log detail, tampilkan generic ke user) |
| 503 | `QUEUE_ERROR` | Redis tidak tersedia |
| 503 | `DB_ERROR` | Database tidak tersedia |

### 9.4 WebSocket Connection Manager

```python
# app/api/websocket/manager.py

from typing import Dict, Set
from fastapi import WebSocket
import json
import structlog

logger = structlog.get_logger()

class ConnectionManager:
    """
    In-memory WebSocket pool. CATATAN: hanya cocok untuk single-instance deployment.
    Untuk multi-instance, gunakan Redis Pub/Sub (roadmap v1.1+).
    """
    
    def __init__(self):
        # Dipisah per role untuk broadcast selektif
        self.supervisor_connections: Dict[str, Set[WebSocket]] = {}
        self.technician_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect_supervisor(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.supervisor_connections.setdefault(user_id, set()).add(websocket)
        logger.info("Supervisor WS connected", user_id=user_id)

    async def connect_technician(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.technician_connections.setdefault(user_id, set()).add(websocket)
        logger.info("Technician WS connected", user_id=user_id)

    def disconnect(self, websocket: WebSocket, user_id: str, role: str):
        pool = self.supervisor_connections if role == "supervisor" else self.technician_connections
        if user_id in pool:
            pool[user_id].discard(websocket)
            if not pool[user_id]:
                del pool[user_id]

    async def broadcast_to_supervisors(self, message: dict):
        """Broadcast ke semua supervisor aktif."""
        dead = []
        for user_id, connections in self.supervisor_connections.items():
            for ws in list(connections):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append((user_id, ws))
        # Cleanup koneksi mati
        for user_id, ws in dead:
            self.supervisor_connections.get(user_id, set()).discard(ws)

    async def send_to_technician(self, technician_user_id: str, message: dict):
        """Kirim ke teknisi spesifik (semua tab/device-nya)."""
        for ws in list(self.technician_connections.get(technician_user_id, set())):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    @property
    def active_supervisor_count(self) -> int:
        return len(self.supervisor_connections)

manager = ConnectionManager()
```

---

## 10. Database Schema

### 10.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider             = "prisma-client-py"
  interface            = "asyncio"
  recursive_type_depth = 5
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ENUMS
// ============================================================

enum IncidentStatus {
  PENDING_DISPATCH       // Baru masuk, menunggu review supervisor
  DISPATCHED_MASSAL      // Sudah di-blast ke teknisi
  UNDER_REPAIR           // Teknisi sudah terima dan sedang mengerjakan
  RESOLVED               // Selesai diperbaiki
  CANCELLED              // Dibatalkan supervisor (dengan alasan)
}

enum IncidentUrgency {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TechnicianStatus {
  STANDBY    // Siap menerima perintah kerja
  ON_DUTY    // Sedang mengerjakan tiket
  OFF_DUTY   // Tidak bertugas (shift habis)
  OFFLINE    // Tidak tersedia (force by system jika tidak ada heartbeat)
}

enum AuditAction {
  INCIDENT_CREATED
  STATUS_CHANGED
  TECHNICIAN_ASSIGNED
  BLAST_DISPATCHED
  TECHNICIAN_ACCEPTED
  TECHNICIAN_REJECTED    // [BARU]
  WORK_NOTE_ADDED
  INCIDENT_RESOLVED
  INCIDENT_CANCELLED
  AVAILABILITY_CHANGED   // [BARU]
}

enum SyncSource {
  ONLINE_DIRECT  // Submit langsung saat online
  OFFLINE_SYNC   // Dari antrian offline
}

enum BlastJobStatus {
  QUEUED
  IN_PROGRESS
  COMPLETED
  PARTIAL         // [BARU] Ada yang gagal tapi sebagian berhasil
  FAILED
}

enum UserRole {
  OPERATOR
  SUPERVISOR
  TECHNICIAN
  ADMIN
}

enum ShiftType {
  MORNING
  AFTERNOON
  NIGHT
}

// ============================================================
// USERS & AUTH
// ============================================================

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  pin           String?  @map("pin") // PIN 4-6 digit untuk shared tablet, hashed
  fullName      String   @map("full_name")
  role          UserRole
  isActive      Boolean  @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  operator      Operator?
  supervisor    Supervisor?
  technician    Technician?
  auditLogs     IncidentAuditLog[]
  refreshTokens RefreshToken[]     // [BARU] Token blacklisting untuk logout

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash")
  expiresAt DateTime @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId, revokedAt])
  @@map("refresh_tokens")
}

model Operator {
  id           String     @id @default(uuid())
  userId       String     @unique @map("user_id")
  employeeCode String     @unique @map("employee_code")
  department   String
  shift        ShiftType

  user         User       @relation(fields: [userId], references: [id])
  incidents    Incident[]

  @@map("operators")
}

model Supervisor {
  id           String     @id @default(uuid())
  userId       String     @unique @map("user_id")
  employeeCode String     @unique @map("employee_code")
  area         String

  user         User       @relation(fields: [userId], references: [id])
  blastJobs    BlastJob[]

  @@map("supervisors")
}

model Technician {
  id              String           @id @default(uuid())
  userId          String           @unique @map("user_id")
  employeeCode    String           @unique @map("employee_code")
  specialization  String[]         // ["electrical", "mechanical", "hydraulic"]
  status          TechnicianStatus @default(STANDBY)
  avgMttrMinutes  Float?           @map("avg_mttr_minutes")
  lastHeartbeatAt DateTime?        @map("last_heartbeat_at") // [BARU] Untuk deteksi OFFLINE

  user              User                   @relation(fields: [userId], references: [id])
  pushSubscriptions PushSubscription[]
  incidentWork      IncidentTechnician[]
  performanceLogs   TechnicianPerformance[]
  blastDeliveries   BlastDeliveryLog[]     // [BARU]

  @@map("technicians")
}

// ============================================================
// MACHINES
// ============================================================

model Machine {
  id           String    @id @default(uuid())
  machineCode  String    @unique @map("machine_code") // "EXT-A3"
  name         String
  type         String
  location     String
  floor        String
  area         String    // [BARU] Area/zona untuk filter supervisor
  isActive     Boolean   @default(true) @map("is_active")
  lastRepaired DateTime? @map("last_repaired")
  createdAt    DateTime  @default(now()) @map("created_at")

  incidents    Incident[]

  @@index([area, isActive])
  @@map("machines")
}

// ============================================================
// INCIDENTS (CORE TABLE)
// ============================================================

model Incident {
  id            String          @id @default(uuid())
  ticketNumber  String          @unique @map("ticket_number") // "INC-2026-00042"

  machineId     String          @map("machine_id")
  reportedById  String          @map("reported_by_id")

  incidentType  String          @map("incident_type")
  description   String          @db.Text
  urgency       IncidentUrgency
  status        IncidentStatus  @default(PENDING_DISPATCH)
  photoUrls     String[]        @map("photo_urls")   // [BARU] Array, bukan single URL
  resolvedNote  String?         @map("resolved_note") @db.Text
  cancelNote    String?         @map("cancel_note")  // [BARU] Alasan pembatalan

  // Sinkronisasi Offline
  localId         String?   @unique @map("local_id")
  syncSource      SyncSource @default(ONLINE_DIRECT) @map("sync_source")
  clientTimestamp DateTime? @map("client_timestamp")

  // KPI Timestamps (microsecond precision dari PostgreSQL)
  createdAt     DateTime  @default(now()) @map("created_at")
  dispatchedAt  DateTime? @map("dispatched_at")
  acceptedAt    DateTime? @map("accepted_at")
  resolvedAt    DateTime? @map("resolved_at")
  cancelledAt   DateTime? @map("cancelled_at")

  // Computed KPI (disimpan saat resolve untuk query efisien)
  mttrMinutes     Float? @map("mttr_minutes")
  responseTimeMin Float? @map("response_time_min")

  machine      Machine              @relation(fields: [machineId], references: [id])
  operator     Operator             @relation(fields: [reportedById], references: [id])
  auditLogs    IncidentAuditLog[]
  blastJobs    BlastJobIncident[]
  technicians  IncidentTechnician[]

  @@index([status, urgency])
  @@index([machineId, status])   // [BARU] Untuk cek insiden aktif per mesin
  @@index([machineId, createdAt])
  @@index([createdAt])
  @@index([localId])
  @@map("incidents")
}

model IncidentTechnician {
  id           String    @id @default(uuid())
  incidentId   String    @map("incident_id")
  technicianId String    @map("technician_id")
  assignedAt   DateTime  @default(now()) @map("assigned_at")
  acceptedAt   DateTime? @map("accepted_at")
  rejectedAt   DateTime? @map("rejected_at")  // [BARU]
  rejectReason String?   @map("reject_reason") // [BARU]
  completedAt  DateTime? @map("completed_at")
  workNotes    String?   @map("work_notes") @db.Text

  incident     Incident   @relation(fields: [incidentId], references: [id])
  technician   Technician @relation(fields: [technicianId], references: [id])

  @@unique([incidentId, technicianId])
  @@map("incident_technicians")
}

// ============================================================
// BLAST JOBS
// ============================================================

model BlastJob {
  id             String         @id @default(uuid())
  supervisorId   String         @map("supervisor_id")
  message        String?        @db.Text
  status         BlastJobStatus @default(QUEUED)
  technicianCount Int           @default(0) @map("technician_count")
  successCount   Int            @default(0) @map("success_count")
  failedCount    Int            @default(0) @map("failed_count")
  createdAt      DateTime       @default(now()) @map("created_at")
  startedAt      DateTime?      @map("started_at")
  completedAt    DateTime?      @map("completed_at")

  supervisor    Supervisor         @relation(fields: [supervisorId], references: [id])
  incidents     BlastJobIncident[]
  deliveries    BlastDeliveryLog[] // [BARU] Per-teknisi delivery status

  @@index([status, createdAt])
  @@map("blast_jobs")
}

model BlastJobIncident {
  blastJobId String @map("blast_job_id")
  incidentId String @map("incident_id")

  blastJob BlastJob @relation(fields: [blastJobId], references: [id])
  incident Incident @relation(fields: [incidentId], references: [id])

  @@id([blastJobId, incidentId])
  @@map("blast_job_incidents")
}

// [BARU] Detail pengiriman push per teknisi per blast
model BlastDeliveryLog {
  id              String    @id @default(uuid())
  blastJobId      String    @map("blast_job_id")
  technicianId    String    @map("technician_id")
  subscriptionId  String    @map("subscription_id")
  status          String    // "SUCCESS" | "FAILED" | "EXPIRED_SUBSCRIPTION"
  errorMessage    String?   @map("error_message")
  sentAt          DateTime  @default(now()) @map("sent_at")

  blastJob    BlastJob   @relation(fields: [blastJobId], references: [id])
  technician  Technician @relation(fields: [technicianId], references: [id])

  @@index([blastJobId, status])
  @@map("blast_delivery_logs")
}

// ============================================================
// AUDIT TRAIL
// ============================================================

model IncidentAuditLog {
  id             String          @id @default(uuid())
  incidentId     String          @map("incident_id")
  actorId        String          @map("actor_id")
  action         AuditAction
  previousStatus IncidentStatus? @map("previous_status")
  newStatus      IncidentStatus? @map("new_status")
  metadata       Json?
  ipAddress      String?         @map("ip_address")
  userAgent      String?         @map("user_agent")
  createdAt      DateTime        @default(now()) @map("created_at")

  incident Incident @relation(fields: [incidentId], references: [id])
  actor    User     @relation(fields: [actorId], references: [id])

  @@index([incidentId, createdAt])
  @@index([actorId, createdAt])
  @@index([action, createdAt])
  @@map("incident_audit_logs")
}

// ============================================================
// TECHNICIAN PERFORMANCE (Materialized Monthly)
// ============================================================

model TechnicianPerformance {
  id                 String    @id @default(uuid())
  technicianId       String    @map("technician_id")
  periodMonth        Int       @map("period_month")
  periodYear         Int       @map("period_year")
  totalResolved      Int       @default(0) @map("total_resolved")
  avgMttrMinutes     Float?    @map("avg_mttr_minutes")
  avgResponseMin     Float?    @map("avg_response_min")
  criticalHandled    Int       @default(0) @map("critical_handled")
  totalBlastReceived Int       @default(0) @map("total_blast_received")
  acceptanceRate     Float?    @map("acceptance_rate")
  updatedAt          DateTime  @updatedAt @map("updated_at") // [BARU] Track kapan terakhir di-aggregate

  technician Technician @relation(fields: [technicianId], references: [id])

  @@unique([technicianId, periodMonth, periodYear])
  @@map("technician_performance")
}

// ============================================================
// PUSH SUBSCRIPTIONS
// ============================================================

model PushSubscription {
  id           String    @id @default(uuid())
  technicianId String    @map("technician_id")
  endpoint     String    @db.Text
  p256dhKey    String    @map("p256dh_key") @db.Text
  authKey      String    @map("auth_key")
  deviceLabel  String?   @map("device_label")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  lastUsed     DateTime? @map("last_used")
  lastFailed   DateTime? @map("last_failed") // [BARU] Track subscription bermasalah

  technician Technician @relation(fields: [technicianId], references: [id])

  @@index([technicianId, isActive])
  @@map("push_subscriptions")
}

// ============================================================
// SYSTEM CONFIG (Master data konfigurasi) — [BARU]
// ============================================================

model SystemConfig {
  key       String @id
  value     Json
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy String   @map("updated_by")

  @@map("system_configs")
}
```

### 10.2 Database Indexes — Rationale

| Index | Tabel | Alasan |
|---|---|---|
| `(status, urgency)` | incidents | Dashboard supervisor sort by urgency dalam tiap status |
| `(machineId, status)` | incidents | Cek apakah mesin punya insiden aktif (FR-OP-11) |
| `(incidentId, createdAt)` | audit_logs | Timeline audit trail per tiket |
| `(blastJobId, status)` | blast_delivery_logs | Analytics blast success rate |
| `(technicianId, isActive)` | push_subscriptions | Ambil subscription aktif saat blast |

---

## 11. API Contracts

### 11.1 `POST /api/v1/incidents/sync` — Offline Sync

**Auth:** Bearer JWT (role: `OPERATOR`)
**Content-Type:** `application/json`
**Rate Limit:** 10 request/menit per user

**Request:**
```json
{
  "incidents": [
    {
      "local_id": "uuid-v4-browser-generated",
      "machine_id": "machine-uuid",
      "incident_type": "Mekanik",
      "description": "Bearing conveyor berbunyi keras",
      "urgency": "HIGH",
      "photos_base64": ["base64string1", "base64string2"],
      "client_timestamp": "2026-05-24T07:45:00.000Z"
    }
  ]
}
```

**Constraint:** Maksimum 50 insiden per request. Foto per insiden: max 3, max 1MB per foto setelah kompresi.

**Response: 207 Multi-Status**
```json
{
  "status": "partial_success",
  "data": {
    "synced": [
      {
        "localId": "uuid-v4-browser-generated",
        "serverUuid": "server-generated-uuid",
        "ticketNumber": "INC-2026-00042",
        "status": "PENDING_DISPATCH",
        "createdAt": "2026-05-24T07:45:00.000Z"
      }
    ],
    "skipped": [
      {
        "localId": "duplicate-local-id",
        "reason": "DUPLICATE_LOCAL_ID",
        "existingServerUuid": "...",
        "existingTicketNumber": "INC-2026-00039"
      }
    ],
    "failed": [
      {
        "localId": "failed-uuid",
        "error": "MACHINE_NOT_FOUND",
        "message": "Mesin dengan ID ini tidak ditemukan"
      }
    ]
  },
  "meta": {
    "totalReceived": 3,
    "syncedCount": 1,
    "skippedCount": 1,
    "failedCount": 1,
    "processedAt": "2026-05-24T14:32:07.221Z",
    "requestId": "req_uuid"
  }
}
```

### 11.2 `POST /api/v1/incidents/dispatch-blast`

**Auth:** Bearer JWT (role: `SUPERVISOR`)
**Rate Limit:** 1 blast per 30 detik per supervisor

**Request:**
```json
{
  "incident_ids": ["inc-uuid-1", "inc-uuid-2"],
  "message": "Mohon segera tangani. Prioritas tinggi.",
  "notify_all_standby": true,
  "target_specializations": ["mechanical"],
  "target_technician_ids": []
}
```

**Response: 202 Accepted**
```json
{
  "status": "accepted",
  "data": {
    "blastJobId": "bjob-uuid",
    "incidentCount": 2,
    "technicianCount": 8,
    "estimatedDurationSeconds": 3,
    "updatedIncidents": [...],
    "skippedIncidents": [...]
  },
  "message": "Blast job diantrekan. Monitor progress via WebSocket event BLAST_PROGRESS.",
  "meta": {
    "dispatchedBy": "user-uuid",
    "dispatchedAt": "2026-05-24T14:32:07.221Z",
    "requestId": "req_uuid"
  }
}
```

### 11.3 Endpoint Lengkap

```
# Auth
POST   /api/v1/auth/login                         # Login → JWT pair
POST   /api/v1/auth/refresh                       # Refresh access token
POST   /api/v1/auth/logout                        # Revoke refresh token

# Incidents
GET    /api/v1/incidents                          # List (filter: status, urgency, area, machine, date)
GET    /api/v1/incidents/{id}                     # Detail + audit log
POST   /api/v1/incidents/sync                     # Offline sync (bulk)
POST   /api/v1/incidents/dispatch-blast           # Blast notifikasi massal
PATCH  /api/v1/incidents/{id}/status              # Update status (teknisi/supervisor)
POST   /api/v1/incidents/{id}/notes               # Tambah catatan kerja
DELETE /api/v1/incidents/{id}                     # Cancel tiket (supervisor, soft delete)

# Machines
GET    /api/v1/machines                           # List mesin aktif (untuk dropdown operator)
GET    /api/v1/machines/{id}                      # Detail mesin
POST   /api/v1/machines                           # [ADMIN] Tambah mesin
PATCH  /api/v1/machines/{id}                      # [ADMIN] Edit mesin
DELETE /api/v1/machines/{id}                      # [ADMIN] Nonaktifkan mesin

# Technicians
GET    /api/v1/technicians                        # List + status real-time
GET    /api/v1/technicians/{id}                   # Detail + histori
PATCH  /api/v1/technicians/me/status              # Update status diri sendiri
POST   /api/v1/technicians/me/push-subscribe      # Register push subscription
DELETE /api/v1/technicians/me/push-subscribe/{id} # Unregister subscription

# Dashboard & KPI
GET    /api/v1/dashboard/kpi                      # KPI summary (supervisor)
GET    /api/v1/dashboard/audit-log                # Global audit log (dengan pagination)
GET    /api/v1/dashboard/blast-history            # Riwayat blast jobs

# Reports (Async)
POST   /api/v1/reports/export                     # Request CSV export (async)
GET    /api/v1/reports/export/{job_id}            # Cek status export + download link

# Admin
GET    /api/v1/admin/users                        # List semua user
POST   /api/v1/admin/users                        # Buat user baru
PATCH  /api/v1/admin/users/{id}                   # Edit user
DELETE /api/v1/admin/users/{id}                   # Nonaktifkan user
GET    /api/v1/admin/config                       # Baca konfigurasi sistem
PATCH  /api/v1/admin/config                       # Update konfigurasi sistem

# WebSocket
WS     /ws/supervisor?token=<jwt>                 # Real-time stream supervisor
WS     /ws/technician?token=<jwt>                 # Real-time untuk teknisi

# System
GET    /health                                    # Health check semua dependency
GET    /metrics                                   # Basic metrics (opsional)
```

---

## 12. Real-Time & Async Architecture

### 12.1 WebSocket Event Catalog

Semua event WebSocket menggunakan format standar:

```json
{
  "type": "EVENT_TYPE",
  "payload": { ... },
  "timestamp": "2026-05-24T14:32:07.221Z",
  "version": "1.0"
}
```

| Event Type | Arah | Target | Deskripsi |
|---|---|---|---|
| `INCIDENT_CREATED` | Server → Client | Supervisors | Tiket baru masuk dari operator |
| `INCIDENT_UPDATED` | Server → Client | Supervisors | Status/data tiket berubah |
| `INCIDENT_RESOLVED` | Server → Client | Supervisors | Tiket selesai |
| `BLAST_QUEUED` | Server → Client | Supervisors | Blast job baru diantrekan |
| `BLAST_PROGRESS` | Server → Client | Supervisors | Update progress blast (%) |
| `BLAST_COMPLETED` | Server → Client | Supervisors | Blast job selesai |
| `TECHNICIAN_STATUS_CHANGED` | Server → Client | Supervisors | Teknisi berubah status |
| `WORK_ORDER_ASSIGNED` | Server → Client | Technician spesifik | Ada tiket yang di-assign langsung |
| `PING` | Server → Client | All | Heartbeat setiap 30 detik |
| `PONG` | Client → Server | All | Respons heartbeat (wajib dalam 60 detik) |

### 12.2 Diagram Alur Asinkron Blast

```
Supervisor        FastAPI           Redis           ARQ Worker        FCM/WebPush
    │                │                │                 │                 │
    │── POST blast ──▶│                │                 │                 │
    │                │── validate ────│                 │                 │
    │                │── DB update ───│                 │                 │
    │                │── enqueue ────▶│                 │                 │
    │◀── 202 ────────│                │                 │                 │
    │                │                │── dequeue ─────▶│                 │
    │                │                │                 │── loop tech ───▶│
    │◀── WS: PROGRESS (20%) ──────────────────────────▶│                 │
    │◀── WS: PROGRESS (60%) ──────────────────────────▶│                 │
    │◀── WS: COMPLETED ───────────────────────────────▶│                 │
```

---

## 13. Offline-First Strategy

### 13.1 Strategi Cache per Resource Type

| Resource | Strategi | TTL | Alasan |
|---|---|---|---|
| App shell (HTML/JS/CSS) | Cache First (Workbox) | Seumur app version | Harus selalu ada offline |
| Daftar Mesin (`/api/v1/machines`) | Network First, fallback cache | 24 jam | Bisa berubah tapi jarang |
| Form draft | IndexedDB | Manual delete by user | Drafts tidak expire |
| Insiden pending sync | IndexedDB | Manual (setelah sync) | Zero data loss |
| JWT token | localStorage (secure, httpOnly cookie lebih baik) | Sesuai expiry | Perlu akses saat online |

### 13.2 Offline Auth Strategy

**Problem:** Operator menggunakan shared tablet. Jika JWT expired saat offline, form tidak bisa disubmit.

**Solusi v1.0:** JWT access token masa berlaku diperpanjang menjadi 8 jam (satu shift). Offline submission menggunakan cached JWT. Saat sync, server validasi token — jika expired, sync ditolak dengan error `TOKEN_EXPIRED_AT_SYNC` dan UI meminta operator login ulang sebelum submit ulang. Data di IndexedDB tetap aman.

> **Alternatif (v1.1):** Gunakan offline-capable certificate pinning dengan service worker intercepting dan signing offline submissions.

### 13.3 Conflict Resolution

Skenario konflik yang mungkin terjadi dan cara penanganannya:

| Skenario | Penanganan |
|---|---|
| Insiden yang sama di-submit dua kali (double tap) | Deduplikasi via `localId` — yang kedua di-skip dengan response `DUPLICATE_LOCAL_ID` |
| Dua operator berbeda melaporkan mesin yang sama saat offline | Keduanya diterima, server membuat dua tiket berbeda. Supervisor harus manually merge/cancel satu. System warning di dashboard: "Mesin X punya 2 tiket aktif" |
| `machine_id` tidak valid saat sync (mesin dihapus admin saat operator offline) | Sync gagal dengan `MACHINE_NOT_FOUND`. Data tetap di IndexedDB dengan status `sync_failed`. Operator perlu lapor ulang dengan mesin yang benar. |

---

## 14. Notification Blast Architecture

### 14.1 Push Notification Payload

```json
{
  "notification": {
    "title": "⚙️ Perintah Kerja (3 Insiden)",
    "body": "Extruder A3 • Conveyor C2 • Press B1 — Segera tangani."
  },
  "data": {
    "type": "BLAST_DISPATCH",
    "blastJobId": "bjob-uuid",
    "incidentIds": "[\"inc-1\",\"inc-2\",\"inc-3\"]",
    "actionUrl": "/technician/dashboard",
    "urgencyLevel": "CRITICAL",
    "dispatchedBy": "Rina S.",
    "timestamp": "2026-05-24T14:32:07.221Z"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channelId": "mamoth_work_orders",
      "priority": "MAX",
      "sound": "alarm",
      "vibrateTimingsMillis": [0, 500, 200, 500]
    }
  },
  "webpush": {
    "headers": { "Urgency": "high", "TTL": "86400" },
    "notification": {
      "requireInteraction": true,
      "actions": [
        {"action": "accept", "title": "✅ Terima"},
        {"action": "view", "title": "👁️ Lihat"}
      ]
    }
  }
}
```

### 14.2 Retry Strategy Failed Push

```python
# Strategi: Exponential backoff, maksimum 3 percobaan

MAX_RETRIES = 3
RETRY_DELAYS_SECONDS = [5, 30, 120]

async def send_push_with_retry(subscription, payload, attempt=0):
    try:
        await push_service.send_push(subscription, payload)
        return "SUCCESS"
    except PushSubscriptionExpiredException:
        # Hapus subscription dari DB, jangan retry
        await mark_subscription_expired(subscription.id)
        return "EXPIRED"
    except PushNetworkError:
        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(RETRY_DELAYS_SECONDS[attempt])
            return await send_push_with_retry(subscription, payload, attempt + 1)
        else:
            return "FAILED"
    except Exception as e:
        logger.error("Unexpected push error", error=str(e), sub_id=subscription.id)
        return "FAILED"
```

### 14.3 Blast Rate & Throughput Design

- **Target:** 50 teknisi < 5 detik (termasuk throttle 50ms antar kiriman)
- **Bottleneck:** FCM rate limit per project (sekitar 600k pesan/menit — jauh di atas kebutuhan)
- **Throttle:** `asyncio.sleep(0.05)` antar teknisi = 50ms. Untuk 50 teknisi: 50 × 0.05 = 2.5 detik + network latency FCM ≈ total < 5 detik

---

## 15. File & Media Storage Strategy

> **Gap di PRD v1.0:** Strategi penyimpanan foto tidak didefinisikan secara eksplisit. Seksi ini menutup gap tersebut.

### 15.1 Opsi Storage

| Opsi | Kelebihan | Kekurangan | Rekomendasi v1.0 |
|---|---|---|---|
| Local Volume Docker | Simpel, tanpa biaya tambahan, offline-capable | Tidak scalable, backup manual, tidak ada CDN | ✅ **Dipilih untuk v1.0** |
| MinIO Self-Hosted | S3-compatible, scalable, bisa di-cluster | Kompleksitas tambahan, resource lebih besar | v1.1 migration path |
| Cloudflare R2 / S3 | Production-grade, CDN built-in | Biaya, ketergantungan eksternal, regulasi data | v2.0 jika skala besar |

### 15.2 Implementasi v1.0 (Local Volume)

- Foto disimpan di `/app/uploads/incidents/{year}/{month}/{incident_id}/`
- Naming convention: `{incident_id}_{photo_index}_{timestamp}.jpg`
- Diakses via endpoint static: `GET /uploads/incidents/{path}`
- Endpoint dilindungi auth (tidak bisa diakses tanpa JWT)
- Backup: volume di-backup setiap malam oleh DokPloy backup cron

### 15.3 Lifecycle Foto

- Foto di IndexedDB (base64) dihapus dari IndexedDB setelah berhasil upload ke server
- Server menyimpan URL relatif di field `photo_urls` (array of strings)
- Foto dari tiket CANCELLED/RESOLVED tidak dihapus (audit evidence)
- Retention policy: minimum 1 tahun (dapat dikonfigurasi via `SystemConfig`)

### 15.4 Kompresi & Validasi

```typescript
// src/lib/image/compress.ts

import imageCompression from 'browser-image-compression';

export async function compressIncidentPhoto(file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

export function validatePhotoCount(photos: File[]): boolean {
  return photos.length <= 3;
}
```

---

## 16. Infrastruktur & Containerization

### 16.1 Docker Services Overview

| Service | Image | Fungsi | Resource Limit |
|---|---|---|---|
| `postgres` | postgres:16-alpine | Database utama | 1 CPU, 512MB RAM |
| `redis` | redis:7.2-alpine | Queue + Rate limit cache | 0.5 CPU, 256MB RAM |
| `backend` | Custom (python:3.12-slim) | FastAPI API + WebSocket | 1 CPU, 512MB RAM |
| `worker` | Custom (python:3.12-slim) | ARQ background worker | 0.5 CPU, 256MB RAM |
| `frontend` | Custom (nginx:1.25-alpine) | Static serving + reverse proxy | 0.25 CPU, 128MB RAM |

**Total minimum:** ~3.25 CPU, ~1.4GB RAM — cocok untuk VPS 4 core 4GB, dengan headroom untuk OS.

### 16.2 Dockerfile — Frontend (Multi-Stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile
COPY . .
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ARG VITE_FCM_VAPID_KEY=""
ENV VITE_API_URL=$VITE_API_URL VITE_WS_URL=$VITE_WS_URL VITE_FCM_VAPID_KEY=$VITE_FCM_VAPID_KEY
RUN npm run build

# Stage 2: Production
FROM nginx:1.25-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost/ || exit 1
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 16.3 Nginx Configuration

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on; gzip_vary on; gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               image/svg+xml application/vnd.ms-fontobject font/opentype;

    # Static assets — agresif cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker — jangan cache
    location /sw.js {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /manifest.json {
        expires -1;
        add_header Cache-Control "no-cache";
    }

    # Protected file uploads
    location /uploads/ {
        proxy_pass http://backend:8000;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Host $host;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options nosniff;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 15M;
        proxy_read_timeout 60s;
    }
}
```

### 16.4 Docker Compose — Production

```yaml
version: "3.9"

networks:
  mamoth-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  media_uploads:

services:
  postgres:
    image: postgres:16-alpine
    container_name: mamoth-postgres
    restart: unless-stopped
    networks: [mamoth-network]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-mamoth_ops}
      POSTGRES_USER: ${POSTGRES_USER:-mamoth}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-mamoth}"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports: ["127.0.0.1:5432:5432"]
    command: >
      postgres
        -c max_connections=100
        -c shared_buffers=256MB
        -c effective_cache_size=1GB
        -c log_min_duration_statement=1000
    labels:
      - "dokploy.backup=true"
      - "dokploy.backup.schedule=0 2 * * *"

  redis:
    image: redis:7.2-alpine
    container_name: mamoth-redis
    restart: unless-stopped
    networks: [mamoth-network]
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: redis-server /usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports: ["127.0.0.1:6379:6379"]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mamoth-backend
    restart: unless-stopped
    networks: [mamoth-network]
    volumes:
      - media_uploads:/app/uploads
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY:?required}
      CORS_ORIGINS: ${CORS_ORIGINS}
      FCM_PROJECT_ID: ${FCM_PROJECT_ID}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_CLAIMS_EMAIL: ${VAPID_CLAIMS_EMAIL}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      UVICORN_WORKERS: ${UVICORN_WORKERS:-2}
      ENVIRONMENT: production
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:   { cpus: '1.0', memory: 512M }
        reservations: { cpus: '0.25', memory: 256M }

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: mamoth-worker
    restart: unless-stopped
    networks: [mamoth-network]
    volumes:
      - media_uploads:/app/uploads
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      FCM_PROJECT_ID: ${FCM_PROJECT_ID}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      ENVIRONMENT: production
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    deploy:
      resources:
        limits: { cpus: '0.5', memory: 256M }

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: /api
        VITE_WS_URL: /ws
        VITE_FCM_VAPID_KEY: ${VAPID_PUBLIC_KEY}
    container_name: mamoth-frontend
    restart: unless-stopped
    networks: [mamoth-network]
    ports: ["80:80"]
    depends_on: [backend]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits: { cpus: '0.25', memory: 128M }
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mamoth.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.mamoth.entrypoints=websecure"
      - "traefik.http.routers.mamoth.tls.certresolver=letsencrypt"
```

---

## 17. Security & Compliance

### 17.1 Authentication & Authorization

| Layer | Mekanisme | Catatan |
|---|---|---|
| Auth | JWT: Access Token (8 jam untuk operator shift) + Refresh Token (30 hari) | 8 jam untuk mendukung offline operator satu shift |
| Token Revocation | Refresh Token disimpan di DB dengan hash; logout menandai token sebagai revoked | Wajib untuk security saat perangkat hilang |
| Password | bcrypt cost factor 12 | Minimum 8 karakter, mixed case |
| PIN (shared tablet) | 6-digit PIN hashed dengan bcrypt | PIN di-rotate setiap shift atau saat perangkat berganti tangan |
| WebSocket | JWT di query string saat handshake; server validasi & tolak jika expired | Token tidak di-log oleh Nginx (konfigurasi access log format) |
| CORS | Whitelist domain spesifik; tidak pakai wildcard di production | — |
| Rate Limiting | Login: 5 percobaan/15 menit; Blast: 1/30 detik; Sync: 10/menit; API umum: 100/menit | Implementasi via Redis |

### 17.2 Data Security

- Semua traffic wajib HTTPS/WSS di production (TLS via DokPloy + Traefik + Let's Encrypt)
- Foto divalidasi MIME type dan magic bytes sebelum disimpan (bukan hanya ekstensi)
- Foto tidak dapat diakses tanpa JWT yang valid
- Database credential tidak pernah masuk ke application log
- `SECRET_KEY` minimum 64 karakter random, di-generate saat pertama setup
- Redis dilindungi password (REDIS_PASSWORD wajib di production)
- Tidak ada data sensitif (password hash, token) di response API

### 17.3 Role-Based Access Control (RBAC)

| Resource / Action | OPERATOR | SUPERVISOR | TECHNICIAN | ADMIN |
|---|---|---|---|---|
| Submit insiden | ✅ | ❌ | ❌ | ✅ |
| Lihat tiket | Milik sendiri | Semua | Assigned | Semua |
| Update status tiket | ❌ | ✅ | Assigned saja | ✅ |
| Cancel tiket | ❌ | ✅ | ❌ | ✅ |
| Blast notifikasi | ❌ | ✅ | ❌ | ✅ |
| Dashboard KPI | ❌ | ✅ | ❌ | ✅ |
| Export report | ❌ | ✅ | ❌ | ✅ |
| WebSocket supervisor | ❌ | ✅ | ❌ | ✅ |
| WebSocket teknisi | ❌ | ❌ | ✅ | ✅ |
| Manajemen user | ❌ | ❌ | ❌ | ✅ |
| Master data mesin | ❌ | ❌ | ❌ | ✅ |
| Konfigurasi sistem | ❌ | ❌ | ❌ | ✅ |

### 17.4 OWASP Top 10 Checklist

| OWASP Risk | Mitigasi |
|---|---|
| A01 Broken Access Control | RBAC di setiap endpoint; middleware validasi role |
| A02 Cryptographic Failures | HTTPS enforced; bcrypt untuk password; JWT signed HS256 |
| A03 Injection | Prisma ORM parameterized queries; Pydantic input validation |
| A04 Insecure Design | Threat modeling per feature (blast, offline sync) |
| A05 Security Misconfiguration | Production env strict; tidak ada debug endpoints exposed |
| A06 Vulnerable Components | `pip audit` + `npm audit` di CI pipeline |
| A07 Auth Failures | Rate limiting login; JWT expiry; token revocation |
| A08 Integrity Failures | Signed JWT; HTTPS untuk semua transfer |
| A09 Logging Failures | Structured log setiap request; audit trail setiap state change |
| A10 SSRF | Tidak ada fetch URL dari user input; allowlist domain push endpoints |

---

## 18. KPI & Success Metrics

### 18.1 KPI Operasional

| Metrik | Formula | Baseline (Ukur minggu 1-2) | Target v1.0 (Bulan 6) |
|---|---|---|---|
| **Waktu Pelaporan Insiden** | Waktu buka form → submit | TBD dari observasi | < 2 menit |
| **Waktu Dispatch** | `dispatched_at - created_at` | TBD | < 60 detik |
| **MTTR** | `AVG(resolved_at - created_at)` | TBD | Turun 35% dari baseline |
| **Response Time Teknisi** | `AVG(accepted_at - dispatched_at)` | TBD | < 5 menit |
| **Blast Delivery Rate** | `success_count / technician_count * 100` | N/A | > 95% |
| **Sync Success Rate** | `synced / total_offline_records * 100` | N/A | > 99.5% |
| **Incident Backlog** | Count tiket `PENDING_DISPATCH` > 30 menit | TBD | < 5 tiket per shift |

### 18.2 KPI Teknikal

| Metrik | Target | Cara Ukur |
|---|---|---|
| API response time (p95) | < 200ms | Application logs + timing middleware |
| Blast throughput | 50 teknisi < 5 detik | BlastJob `completed_at - started_at` |
| WebSocket reconnect time | < 5 detik | Client-side telemetry |
| Offline → Online sync delay | < 5 detik setelah `online` event | Client-side telemetry |
| Uptime sistem | > 99.5% | Health check monitoring + alerting |
| Database query p95 | < 50ms | PostgreSQL `pg_stat_statements` |

### 18.3 Review Checkpoint

- **Minggu 1-2:** Ukur baseline KPI operasional dari proses manual saat ini
- **Bulan 1:** Review adoption rate (berapa % operator sudah pakai sistem)
- **Bulan 3:** Review MTTR pertama, identifikasi bottleneck
- **Bulan 6:** Full KPI review — Go/No-Go untuk v1.1 features

---

## 19. Non-Functional Requirements

| Kategori | Requirement | Cara Verifikasi |
|---|---|---|
| **Performance** | API p95 < 200ms; Blast 50 teknisi < 5 detik; Dashboard load < 3 detik | Load test dengan k6 |
| **Availability** | 99.5% uptime (maks downtime 3.6 jam/bulan); graceful degradation saat Redis down | Uptime monitoring |
| **Scalability** | Mendukung hingga 200 tiket aktif bersamaan, 50 teknisi, 10 supervisor | Load test |
| **Offline** | Form berfungsi 100% tanpa internet; data zero-loss saat Wi-Fi mati hingga 24 jam | End-to-end offline test |
| **Security** | OWASP Top 10 compliance; JWT + RBAC; HTTPS enforced | Penetration test (minimal) |
| **Accessibility** | Touch target ≥ 48px; kontras ≥ 4.5:1 (WCAG AA); label form jelas | Manual accessibility audit |
| **Observability** | Structured JSON logging dengan request_id; health check semua service; error rate alerting | Log aggregation |
| **Maintainability** | Prisma migration versioning; API versioning (/v1); changelog per release | Code review + CI |
| **Browser Support** | Chrome 90+ (semua platform) | Manual test pada device target |
| **Localization** | Bahasa Indonesia untuk semua UI dan error message user-facing | Review copy |

---

## 20. Testing Strategy

> **Gap di PRD v1.0:** Testing strategy tidak didefinisikan. Seksi ini menutup gap tersebut.

### 20.1 Testing Pyramid

```
          /\
         /  \  E2E Tests (Playwright)
        /    \  — Happy path: report → blast → resolve
       /------\
      /        \  Integration Tests (pytest-asyncio)
     /          \  — API endpoints dengan DB test (PostgreSQL in Docker)
    /            \  — WebSocket events
   /--------------\
  /                \  Unit Tests
 /                  \  — Business logic (MTTR calculation, state machine)
/____________________\  — Offline sync deduplication logic
                         — Push notification retry logic
```

### 20.2 Critical Test Scenarios

| Scenario | Type | Priority |
|---|---|---|
| Operator submit form offline, sync saat online | E2E | Must |
| Blast ke 50 teknisi, semua terkirim | Integration | Must |
| Blast sebagian gagal (5 dari 50) — partial success | Integration | Must |
| Duplikasi localId saat sync → idempotent response | Unit + Integration | Must |
| WebSocket reconnect setelah koneksi putus | Integration | Must |
| MTTR dihitung dengan benar untuk berbagai durasi | Unit | Must |
| State machine insiden: validasi transisi tidak valid | Unit | Must |
| Rate limiting blast (2 blast dalam 30 detik → 429) | Integration | Must |
| Operator mencoba submit tiket untuk mesin yang sudah ada insiden aktif | E2E | Should |
| Export CSV 1000 tiket dalam < 30 detik | Performance | Should |

### 20.3 Load Testing Target

```
# k6 test scenario: 10 supervisor + 50 teknisi + 100 operator concurrent
scenario_1: 100 operator submit form selama 5 menit (10 request/detik)
scenario_2: 10 supervisor blast bersamaan (rate limit test)
scenario_3: WebSocket: 10 supervisor + 50 teknisi maintain connection selama 30 menit
```

---

## 21. Risk Register

> **Gap di PRD v1.0:** Tidak ada risk register. Seksi ini menutup gap tersebut.

| ID | Risiko | Likelihood | Impact | Mitigasi |
|---|---|---|---|---|
| R-01 | FCM quota/limit terlampaui saat blast besar | Low | High | Monitoring FCM quota; Web Push sebagai fallback |
| R-02 | Background Sync API tidak didukung browser (Chrome 90+ sudah support) | Low | High | Fallback: manual retry button + periodic check saat online |
| R-03 | IndexedDB penuh di tablet (storage quota exceeded) | Medium | High | Bersihkan record `synced` > 7 hari secara otomatis |
| R-04 | JWT expired saat operator offline seharian | Medium | High | Access token 8 jam (satu shift); alert operator jika mendekati expiry |
| R-05 | WebSocket in-memory tidak scale jika deploy multi-instance | Medium | Medium | Documented: v1.0 single instance. Redis Pub/Sub di roadmap v1.1 |
| R-06 | Foto besar memenuhi disk server | Medium | Medium | Kompresi di client; lifecycle policy hapus foto > 1 tahun; monitoring disk |
| R-07 | Teknisi tidak opt-in push notification | High | High | Onboarding: wajib allow notification saat pertama install PWA; reminder di UI |
| R-08 | Duplikasi tiket akibat dua operator report mesin sama (offline) | Medium | Medium | Warning UI saat ada insiden aktif; workflow supervisor untuk merge/cancel |
| R-09 | Data race di ConnectionManager saat asyncio concurrent | Medium | Medium | Gunakan `asyncio.Lock` atau dict + set operations yang atomic |
| R-10 | Timeline 4–5 bulan terlalu ketat untuk 3 developer | High | High | Prioritas Must Have saja untuk v1.0; Should Have masuk v1.1 |

---

## 22. Operational Readiness

> **Gap di PRD v1.0:** Tidak ada panduan operasional. Seksi ini menutup gap tersebut.

### 22.1 Onboarding Plan

**Minggu -2 (sebelum go-live):**
- Install PWA di semua tablet operator (test offline mode)
- Install PWA di semua smartphone teknisi + allow push notification
- Training supervisor: 2 jam session
- Training operator: 30 menit per shift (demokan form submission)

**Minggu -1:**
- Parallel run: operator mengisi form digital DAN kertas (untuk fallback)
- Kumpulkan feedback; fix critical bugs
- Supervisor berlatih blast workflow

**Go-Live:** Hentikan form kertas. Gunakan sistem sepenuhnya.

### 22.2 Support & Incident Response

| Skenario | Respons |
|---|---|
| Server down | Operator kembali ke form kertas sementara; IT restart service via DokPloy |
| Push notification tidak masuk | Cek FCM console; admin reset push subscription teknisi |
| Data operator offline tidak sync | Cek network; jika perlu, admin export manual dari IndexedDB |
| Dashboard supervisor tidak update | Cek WebSocket status; hard refresh atau re-login |

### 22.3 Monitoring & Alerting Minimum

- **Health check endpoint** `/health` dipantau setiap 1 menit (UptimeRobot atau sejenisnya)
- **Disk usage** alert jika > 80% (untuk foto uploads dan PostgreSQL data)
- **Error rate** alert jika > 5% request gagal dalam 5 menit
- **Redis memory** alert jika > 80% maxmemory
- **Blast failure rate** alert jika > 10% delivery failed dalam satu blast job

---

## 23. Deployment Guide (DokPloy)

### 23.1 Prasyarat

```bash
# Di server
# - Docker 24+ dan Docker Compose v2
# - Domain diarahkan ke IP server (DNS A record)
# - DokPloy panel aktif dengan Traefik + SSL

# Generate VAPID keys
npx web-push generate-vapid-keys

# Generate SECRET_KEY (minimum 64 karakter)
openssl rand -hex 64

# Generate POSTGRES_PASSWORD (minimum 32 karakter)
openssl rand -hex 32
```

### 23.2 Langkah Deploy Pertama

```bash
# 1. Clone repository
git clone https://github.com/org/mamoth-ops.git && cd mamoth-ops

# 2. Setup environment
cp .env.example .env.production
# Edit .env.production dengan semua value yang diperlukan

# 3. Build dan start
docker compose --env-file .env.production up -d --build

# 4. Verifikasi semua container healthy
docker compose ps

# 5. Cek log backend (Prisma migrate + server start)
docker compose logs backend --tail=100 --follow

# 6. Buat admin user pertama
docker compose exec backend python -m app.scripts.create_superuser

# 7. Smoke test
curl -f https://${DOMAIN}/health
curl -f https://${DOMAIN}/api/v1/machines  # Harus return 401 (auth working)

# 8. Test WebSocket
wscat -c wss://${DOMAIN}/ws/supervisor?token=$(curl -s -X POST https://${DOMAIN}/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@...","password":"..."}' | jq -r '.data.access_token')
```

### 23.3 Update & Rollback

```bash
# Update ke versi terbaru
git pull origin main
docker compose --env-file .env.production up -d --build --no-deps backend worker frontend

# Rollback (jika build baru bermasalah)
git checkout <previous-tag>
docker compose --env-file .env.production up -d --build --no-deps backend worker frontend

# Database rollback migration (gunakan dengan hati-hati!)
docker compose exec backend prisma migrate resolve --rolled-back <migration_name>
```

### 23.4 Monitoring Harian

```bash
# Status semua service
docker compose ps

# Log real-time
docker compose logs -f backend worker

# Disk usage
df -h && du -sh /var/lib/docker/volumes/mamoth_media_uploads

# Redis queue depth (idealnya 0 saat idle)
docker compose exec redis redis-cli llen arq:queue

# PostgreSQL slow queries
docker compose exec postgres psql -U mamoth -d mamoth_ops \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### 23.5 Environment Template

```bash
# .env.production — JANGAN commit ke git, tambahkan ke .gitignore

# =================== DATABASE ===================
POSTGRES_DB=mamoth_ops
POSTGRES_USER=mamoth
POSTGRES_PASSWORD=GANTI_MINIMUM_32_KARAKTER_RANDOM

# =================== SECURITY ===================
SECRET_KEY=GANTI_MINIMUM_64_KARAKTER_RANDOM
ENVIRONMENT=production
LOG_LEVEL=info

# =================== APP URL ====================
DOMAIN=mamoth.contohpabrik.com
CORS_ORIGINS=https://mamoth.contohpabrik.com

# =================== FCM / PUSH =================
FCM_PROJECT_ID=nama-project-firebase
VAPID_PUBLIC_KEY=DARI_WEB_PUSH_KEYGEN
VAPID_PRIVATE_KEY=DARI_WEB_PUSH_KEYGEN
VAPID_CLAIMS_EMAIL=admin@contohpabrik.com

# =================== PERFORMANCE ================
UVICORN_WORKERS=2
```

---

## 24. Open Questions & Decisions

> Seksi ini mendokumentasikan keputusan yang belum diambil dan harus diselesaikan sebelum sprint dimulai.

| ID | Pertanyaan | Deadline | Owner | Opsi |
|---|---|---|---|---|
| OQ-01 | Apakah tablet operator shared atau personal per operator? | Sprint 0 | Plant Manager | Shared: perlu PIN login per operator. Personal: email+password cukup |
| OQ-02 | Berapa jumlah kategori jenis kerusakan? Siapa yang menentukan? | Sprint 0 | Kepala Maintenance | Hardcode di code vs configurable via SystemConfig |
| OQ-03 | Apakah satu mesin boleh punya lebih dari 1 insiden aktif bersamaan? | Sprint 0 | Kepala Maintenance | Allow: kompleksitas lebih. Block: lebih simpel |
| OQ-04 | Berapa retention period foto insiden? | Sprint 1 | IT + Compliance | 1 tahun, 3 tahun, atau seumur hidup tiket |
| OQ-05 | Apakah teknisi boleh punya lebih dari 1 tiket ON_DUTY bersamaan? | Sprint 1 | Kepala Maintenance | 1 tiket: lebih jelas tracking. Multiple: lebih fleksibel |
| OQ-06 | Apakah MTTR dihitung dari `created_at` atau dari `dispatched_at`? | Sprint 1 | Product Owner | `created_at`: total time. `dispatched_at`: waktu aktual perbaikan |
| OQ-07 | Bagaimana menangani shift malam yang melintasi tengah malam dalam pelaporan? | Sprint 2 | Tim Engineering | Gunakan UTC di DB, konversi ke WIB di UI |
| OQ-08 | Apakah export report perlu approval supervisor sebelum di-download? | Sprint 2 | Compliance | — |

---

## 25. Appendix

### 25.1 Glossary

| Istilah | Definisi |
|---|---|
| **MTTR** | Mean Time to Repair — rata-rata durasi dari laporan insiden hingga selesai diperbaiki |
| **Blast** | Pengiriman notifikasi massal ke banyak penerima secara bersamaan |
| **IndexedDB** | Database browser built-in, persisten di device, kapasitas besar (biasanya ≥ 50MB) |
| **Service Worker** | Script background di browser yang mengelola cache, sync, dan push notification |
| **Background Sync** | API browser untuk menunda network request hingga koneksi tersedia |
| **ARQ** | Async Redis Queue — library Python untuk background task dengan Redis |
| **VAPID** | Voluntary Application Server Identification — standar autentikasi Web Push |
| **FCM** | Firebase Cloud Messaging — layanan push notification Google |
| **PWA** | Progressive Web App — web app dengan kemampuan native (offline, notifikasi, installable) |
| **DokPloy** | Platform deployment self-hosted berbasis Docker Compose |
| **localId** | UUID v4 yang di-generate di browser sebagai identitas unik insiden sebelum sync ke server |
| **serverUuid** | UUID yang di-generate server saat insiden berhasil disimpan di database |
| **RBAC** | Role-Based Access Control — kontrol akses berdasarkan peran pengguna |

### 25.2 Struktur Direktori Monorepo

```
mamoth-ops/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── app/
│   ├── prisma/
│   ├── tests/
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── entrypoint.sh
│   └── requirements.txt
│
├── database/
│   └── init.sql
│
├── redis/
│   └── redis.conf
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
├── CHANGELOG.md
└── README.md
```

### 25.3 Incident Status Machine (State Diagram)

```
                    ┌─────────────────────────────┐
                    │       PENDING_DISPATCH        │ ◀── Created by Operator
                    └──────────────┬──────────────-┘
                                   │
                    ┌──────────────┴──────────────-┐
                    │       DISPATCHED_MASSAL        │ ◀── Blast by Supervisor
                    └──────────────┬──────────────-┘
                                   │
                    ┌──────────────┴──────────────-┐
                    │          UNDER_REPAIR          │ ◀── Accepted by Technician
                    └──────────────┬──────────────-┘
                                   │
                    ┌──────────────┴──────────────-┐
                    │           RESOLVED             │ ◀── Completed by Technician
                    └───────────────────────────────┘

    CANCELLED ◀── dari PENDING_DISPATCH atau DISPATCHED_MASSAL (by Supervisor only)
    
    Transisi tidak valid (akan ditolak dengan INVALID_STATE_TRANSITION):
    - RESOLVED → apapun
    - CANCELLED → apapun
    - UNDER_REPAIR → PENDING_DISPATCH
```

### 25.4 Sequence Diagram: Full Offline Sync

```
Browser (SW)         IndexedDB           Backend API          PostgreSQL
    │                    │                    │                    │
    │  submit form        │                    │                    │
    │───────────────────▶│                    │                    │
    │  write(pending)     │                    │                    │
    │◀───────────────────│                    │                    │
    │                    │                    │                    │
    │  [OFFLINE PERIOD]  │                    │                    │
    │                    │                    │                    │
    │  [event: online]   │                    │                    │
    │  read pending       │                    │                    │
    │───────────────────▶│                    │                    │
    │  [{localId,data}]   │                    │                    │
    │◀───────────────────│                    │                    │
    │                    │                    │                    │
    │  POST /sync        │                    │                    │
    │───────────────────────────────────────▶│                    │
    │                    │                    │  CHECK localId dup │
    │                    │                    │───────────────────▶│
    │                    │                    │◀───────────────────│
    │                    │                    │  INSERT incidents  │
    │                    │                    │───────────────────▶│
    │                    │                    │◀───────────────────│
    │                    │                    │                    │
    │  207 {synced, skipped, failed}          │                    │
    │◀───────────────────────────────────────│                    │
    │                    │                    │                    │
    │  update(synced)    │                    │                    │
    │───────────────────▶│                    │                    │
    │                    │                    │                    │
    │  postMessage(SYNC_COMPLETE) → UI Tab   │                    │
```

### 25.5 Requirements.txt Backend

```txt
# Core
fastapi==0.111.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.3.0

# Database
prisma==0.13.1

# Queue
arq==0.25.0
redis==5.0.4

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9

# Push Notifications
firebase-admin==6.5.0
pywebpush==2.0.0

# HTTP
httpx==0.27.0

# Logging
structlog==24.2.0

# Utils
python-dotenv==1.0.1
pillow==10.3.0       # Image MIME validation
python-magic==0.4.27 # Magic bytes validation [BARU]

# Testing
pytest==8.2.0
pytest-asyncio==0.23.7
factory-boy==3.3.0   # Test data factories [BARU]

# Code Quality [BARU]
ruff==0.4.0
mypy==1.10.0
```

---

*Dokumen ini adalah living document. Setiap perubahan harus melalui review Product Owner dan Lead Engineer sebelum diimplementasikan. Versi ini (v2.0.0) adalah hasil gap analysis menyeluruh dari v1.0.0 — tambahan utama: Assumptions & Constraints, Open Questions, Risk Register, Testing Strategy, Operational Readiness, File Storage Strategy, error taxonomy, missing FR (FR-OP-09 hingga FR-AD-05), dan perbaikan schema database.*

**Roadmap v1.1 (setelah Go-Live Stabil):**
- Redis Pub/Sub untuk WebSocket multi-instance
- Integrasi inventori suku cadang
- Prediksi preventive maintenance berbasis historical MTTR
- Mobile native app (React Native) untuk teknisi
- Single Sign-On (SSO) dengan Active Directory pabrik
- Migrasi storage foto ke MinIO
