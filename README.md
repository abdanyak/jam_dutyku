# ⏱️ Jam Duty Ku (Duty Tracker Discord)

Aplikasi pemantau jam duty otomatis langsung dari channel Discord tanpa database tambahan! Dirancang untuk langsung di-deploy ke **Vercel** via **GitHub**.

## 🚀 Fitur Utama
- **Zero Database**: Membaca langsung riwayat chat dari Discord channel melalui Discord REST API.
- **Deteksi Format Otomatis**: Mendeteksi chat dengan format:
  ```text
  Nama Steam     : Kawa
  On Duty        : 12.09
  Off Duty       : 14.09
  ```
- **Kalkulasi Akurat**: Menghitung durasi otomatis, termasuk duty yang lewat tengah malam (contoh: 23.30 sampai 01.30).
- **Modern Dashboard**: Dibuat dengan **Next.js 14** + **Tailwind CSS** dengan dark mode modern.
- **Deploy 1-Klik**: Siap di-push ke GitHub dan dihubungkan ke Vercel.

---

## 🛠️ Langkah Menghubungkan ke Discord

### 1. Buat Bot Discord (Hanya butuh 2 menit)
1. Buka [Discord Developer Portal](https://discord.com/developers/applications).
2. Klik **New Application**, beri nama (misal: `Duty Tracker`).
3. Masuk ke menu **Bot** di bilah samping:
   - Klik **Reset Token** untuk menyalin token bot (`DISCORD_BOT_TOKEN`).
   - Scroll ke bagian **Privileged Gateway Intents**, centang:
     - ✅ **Message Content Intent** (Wajib agar bot bisa membaca isi teks).
4. Masuk ke menu **OAuth2** -> **URL Generator**:
   - Scope: centang `bot`.
   - Bot Permissions: centang `Read Messages/View Channels` dan `Read Message History`.
   - Buka link invite yang dihasilkan di browser, lalu undang bot ke server Discord kamu.

### 2. Dapatkan Channel ID
1. Di aplikasi Discord, buka **User Settings** -> **Advanced** -> aktifkan **Developer Mode**.
2. Klik kanan pada channel tempat kamu biasa absen -> pilih **Copy Channel ID** (`DISCORD_CHANNEL_ID`).

---

## 🌐 Deploy ke GitHub & Vercel

1. Buat repository baru di **GitHub** (misal: `jam-duty-ku`).
2. Upload semua file dalam folder ini ke repository GitHub tersebut.
3. Buka [Vercel](https://vercel.com), klik **Add New** -> **Project**, lalu impor repository GitHub kamu.
4. Di bagian **Environment Variables**, tambahkan 3 variable berikut:
   - `DISCORD_BOT_TOKEN` = *(Token bot Discord kamu)*
   - `DISCORD_CHANNEL_ID` = *(ID channel tempat absen)*
   - `TARGET_STEAM_NAME` = `Kawa` (atau nama Steam kamu)
5. Klik **Deploy**! Selesai 🎉
Website kamu langsung aktif dan menampilkan seluruh data jam duty kamu secara realtime.
