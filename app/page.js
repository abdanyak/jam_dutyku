'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  User, 
  TrendingUp, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  CalendarDays
} from 'lucide-react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [viewFilter, setViewFilter] = useState('weekly'); // 'weekly' atau 'all'

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/duty');
      if (!res.ok) {
        throw new Error('Gagal memuat data dari API');
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const displayedRecords = viewFilter === 'weekly' 
    ? (data?.weeklyRecords || []) 
    : (data?.records || []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Clock className="w-7 h-7" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Duty Tracker
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  Senin - Minggu
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Periode Aktif: <span className="text-indigo-300 font-medium">{data?.weekRange || 'Memuat rentang...'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-slate-500">
                Update: {lastRefreshed}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {/* Demo Notification */}
        {data?.status === 'demo' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-300">Mode Preview Aktif</p>
              <p className="text-amber-200/80 mt-0.5">
                {data.message} Masukkan token Discord & channel ID di Vercel agar tersinkronisasi otomatis.
              </p>
            </div>
          </div>
        )}

        {/* Highlight Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Minggu Ini (Senin - Minggu) */}
          <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between text-indigo-300 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Jam Duty Minggu Ini</span>
              <CalendarDays className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {data?.summary?.weeklyHours || '0 Jam'}
            </div>
            <p className="text-xs text-indigo-200/70 mt-1">
              {data?.summary?.weeklySessions ?? 0} sesi tercatat (Senin - Minggu)
            </p>
          </div>

          {/* Card 2: Total Keseluruhan */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Keseluruhan</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              {data?.summary?.allTimeHours || '0 Jam'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dari total {data?.summary?.allTimeSessions ?? 0} sesi yang ada
            </p>
          </div>

          {/* Card 3: Target Player */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Pemain (Steam)</span>
              <User className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-extrabold text-white truncate">
              {data?.records?.[0]?.steamName || data?.targetSteamName || 'Kawa'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Target filter absen
            </p>
          </div>
        </div>

        {/* Filter Toggle & Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Riwayat Absen Duty
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dihitung dari pesan di channel Discord
              </p>
            </div>

            {/* Filter Button Toggle */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setViewFilter('weekly')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  viewFilter === 'weekly'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Minggu Ini Saja ({data?.weeklyRecords?.length ?? 0})
              </button>
              <button
                onClick={() => setViewFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  viewFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua Riwayat ({data?.records?.length ?? 0})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Hari / Tanggal</th>
                  <th className="px-6 py-3.5">Nama Steam</th>
                  <th className="px-6 py-3.5">Mulai (On)</th>
                  <th className="px-6 py-3.5">Selesai (Off)</th>
                  <th className="px-6 py-3.5">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && !data ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Memuat data absen...
                      </div>
                    </td>
                  </tr>
                ) : displayedRecords.length > 0 ? (
                  displayedRecords.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700">
                          {item.steamName}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                        {item.onDuty}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-rose-400">
                        {item.offDuty}
                      </td>
                      <td className="px-6 py-4 font-semibold text-indigo-300">
                        {item.durationText}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                      Tidak ada rekapan absen di periode {viewFilter === 'weekly' ? 'Senin - Minggu ini' : 'ini'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <footer className="text-center text-xs text-slate-500 pt-4 pb-8">
          Siklus mingguan otomatis dihitung dari Senin 00:00 s/d Minggu 23:59 WIB.
        </footer>

      </div>
    </div>
  );
}
