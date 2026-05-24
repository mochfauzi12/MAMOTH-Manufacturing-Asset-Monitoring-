# MAMOTH-Ops — Clean Architecture Monorepo

Sistem Manajemen Pemeliharaan Mesin & Operasional Pabrik (**Machine Maintenance & Operations Technology Hub**).

## 🚀 Desain Arsitektur (Clean Architecture)

Proyek ini terstruktur penuh dengan pola **Clean Architecture** (Ports & Adapters) untuk Backend dan struktur modular mutakhir untuk Frontend React, memastikan keterkaitan antar modul murni searah tanpa *circular dependency*:

```
                  ┌──────────────────────────────────────────────┐
                  │                INFRASTRUCTURE                │
                  │   (FastAPI, Prisma Setup, Redis Queue, SW)   │
                  │  ┌────────────────────────────────────────┐  │
                  │  │                ADAPTERS                │  │
                  │  │   (Rest Controllers, Prisma DB, FCM)   │  │
                  │  │  ┌──────────────────────────────────┐  │  │
                  │  │  │           APPLICATION            │  │  │
                  │  │  │    (Use Cases, Zustand Stores)   │  │  │
                  │  │  │  ┌────────────────────────────┐  │  │  │
                  │  │  │  │           DOMAIN           │  │  │  │
                  │  │  │  │ (Core Entities, ABC Repos) │  │  │  │
                  │  │  │  └────────────────────────────┘  │  │  │
                  │  │  └──────────────────────────────────┘  │  │
                  │  └────────────────────────────────────────┘  │
                  └──────────────────────────────────────────────┘
```

### Keunggulan Desain Ini:
1. **Pemisahan Perhatian (Separation of Concerns):** Aturan bisnis murni (`app/domain`) tidak tahu menahu tentang database (Prisma) atau web server (FastAPI).
2. **Independensi Framework:** Pindah dari FastAPI ke Django/Flask, atau React ke Vue hanyalah masalah mengubah adapter/UI, tanpa menyentuh core logika bisnis.
3. **Robust Testing:** Core use case dapat diuji dalam milidetik menggunakan stub memory tanpa perlu menyalakan PostgreSQL.

---

## 📂 Struktur Direktori Monorepo

```
mamoth-ops/
├── backend/                       # FASTAPI PYDANTIC PRISMA BACKEND
│   ├── app/
│   │   ├── domain/                # Layer 1: Core Business Logic (Entities & Exceptions)
│   │   ├── application/           # Layer 2: Application Use Cases & Ports (Interactors)
│   │   ├── adapters/              # Layer 3: REST & WS Controllers, Prisma Repositories
│   │   └── infrastructure/        # Layer 4: Setup server, Database, Redis Worker, Configs
│   ├── prisma/                    # Schema database PostgreSQL
│   └── tests/                     # Automated testing (Unit & Integration)
│
├── frontend/                      # REACT VITE TYPESCRIPT OFFLINE-FIRST PWA
│   ├── src/
│   │   ├── domain/                # Layer 1: Data Interfaces & Business Logic Rules
│   │   ├── adapters/              # Layer 2: IndexedDB (Dexie), Axios API, Websocket, FCM
│   │   ├── application/           # Layer 3: Zustand state stores, sync hooks
│   │   └── presentation/          # Layer 4: React UI components, Pages, Layout, Router
│   └── service-worker/            # Service worker Workbox (Offline Background Sync)
│
├── database/                      # Docker initial setup scripts
├── redis/                         # Konfigurasi caching & queue
├── docker-compose.yml             # Orkestrasi Docker produksi
└── docker-compose.dev.yml         # Orkestrasi Docker lokal development
```

---

## 🛠️ Langkah Menjalankan Proyek (Lokal)

### Prasyarat
- Docker & Docker Compose terinstal di mesin Anda.
- Python 3.12+ (jika menjalankan lokal tanpa Docker).
- Node.js 20+ (jika menjalankan lokal tanpa Docker).

### 1. Inisialisasi Environment
Salin template variable lingkungan:
```bash
cp .env.example .env
```
Ubah nilai di dalam `.env` sesuai kebutuhan kredensial lokal Anda.

### 2. Jalankan dengan Docker Compose
Gunakan Docker Compose untuk meluncurkan database, redis, backend server, worker, dan frontend sekaligus:
```bash
docker compose up -d --build
```

### 3. Jalankan Database Migrations (Prisma)
Setelah database PostgreSQL aktif di Docker:
```bash
cd backend
prisma db push
```

Selamat berkarya! Struktur ini siap digunakan untuk pengembangan fitur inti berikutnya.
