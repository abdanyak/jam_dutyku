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
  CalendarDays,
  Target,
  CheckCircle2,
  Flame
} from 'lucide-react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [viewFilter, setViewFilter] = useState('weekly');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/duty');
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.details || errorJson.error || 'Gagal memuat data dari Discord');
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format tanggal Indonesia tetap & konsisten
  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const displayedRecords = viewFilter === 'today'
    ? (data?.todayRecords || [])
    : viewFilter === 'weekly'
    ? (data?.weeklyRecords || [])
    : (data?.records || []);

  const isCurrentlyDuty = data?.records?.some(r => r.isOngoing);
  const weeklyTarget = data?.targets?.weekly;
  const dailyTarget = data?.targets?.daily;

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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Duty Tracker
                </h1>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  Target: 21 Jam/Minggu &bull; Min 3 Jam/Hari
                </span>
                {isCurrentlyDuty && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Sedang On Duty
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Periode Aktif: <span className="text-indigo-300 font-medium">{data?.weekRange || 'Memuat...'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-slate-500 font-mono">
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

        {/* Demo / Config Notice */}
        {data?.status === 'demo' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-300">Konfigurasi Belum Terhubung</p>
              <p className="text-amber-200/80 mt-0.5">{data.message}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-rose-200">
              <p className="font-semibold">Terjadi Kesalahan Membaca Discord</p>
              <p className="mt-0.5 text-xs font-mono">{error}</p>
            </div>
          </div>
        )}

        {/* TARGET TRACKING CARDS (Mingguan 21 Jam & Harian Min 3 Jam) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card Target Mingguan */}
          <div className="p-5 bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl relative overflow-hidden shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Target Mingguan ({weeklyTarget?.targetHours || 21} Jam)
                </span>
              </div>
              {weeklyTarget?.isAchieved ? (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Target Tercapai 🎉
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Kurang: {weeklyTarget?.remainingText || '21 Jam'}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-black text-white">
                  {data?.summary?.weeklyHours || '0 Jam'}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dari target {weeklyTarget?.targetHours || 21} Jam minggu ini
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-400 font-mono">
                  {weeklyTarget?.percentage ?? 0}%
                </div>
                <p className="text-xs text-slate-400">
                  {data?.summary?.weeklySessions ?? 0} sesi tercatat
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    weeklyTarget?.isAchieved 
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' 
                      : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                  }`}
                  style={{ width: `${Math.min(100, weeklyTarget?.percentage ?? 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  {weeklyTarget?.isAchieved ? 'Target mingguan sudah tercukupi!' : 'Sisa minggu ini'}
                </span>
                <span className={`font-semibold ${weeklyTarget?.isAchieved ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {weeklyTarget?.remainingText || 'Memuat...'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Target Harian */}
          <div className="p-5 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl relative overflow-hidden shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Target Hari Ini (Min. {dailyTarget?.targetHours || 3} Jam)
                </span>
              </div>
              {dailyTarget?.isAchieved ? (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Target Tercapai 🎉
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Kurang: {dailyTarget?.remainingText || '3 Jam'}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-black text-white">
                  {data?.summary?.todayHours || '0 Jam'}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dari target minimal {dailyTarget?.targetHours || 3} Jam hari ini
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {dailyTarget?.percentage ?? 0}%
                </div>
                <p className="text-xs text-slate-400">
                  {data?.summary?.todaySessions ?? 0} sesi hari ini
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    dailyTarget?.isAchieved 
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, dailyTarget?.percentage ?? 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  {dailyTarget?.isAchieved ? 'Target harian sudah beres!' : 'Sisa hari ini'}
                </span>
                <span className={`font-semibold ${dailyTarget?.isAchieved ? 'text-emerald-400' : 'text-rose-300'}`}>
                  {dailyTarget?.remainingText || 'Memuat...'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Secondary Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Total Keseluruhan</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {data?.summary?.allTimeHours || '0 Jam'}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dari {data?.summary?.allTimeSessions ?? 0} sesi selesai
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Target Player</span>
              <User className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white truncate">
              {data?.targetSteamName ? data.targetSteamName.toUpperCase() : 'KAWA'}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sesuai pesan Discord kamu
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Status Duty</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {isCurrentlyDuty ? (
                <span className="text-emerald-400 text-lg flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  Sedang On Duty
                </span>
              ) : (
                <span className="text-slate-400 text-lg">Off Duty</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCurrentlyDuty ? 'Sesi absen masih aktif' : 'Belum absen On Duty'}
            </p>
          </div>
        </div>

        {/* Table Box - FIXED COLUMN WIDTH */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Riwayat Absen ({data?.targetSteamName || 'Kawa'})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sinkronisasi langsung dari channel Discord
              </p>
            </div>

            {/* Filter Selector Tabs */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setViewFilter('today')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewFilter === 'today'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hari Ini ({data?.todayRecords?.length ?? 0})
              </button>
              <button
                onClick={() => setViewFilter('weekly')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewFilter === 'weekly'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Minggu Ini ({data?.weeklyRecords?.length ?? 0})
              </button>
              <button
                onClick={() => setViewFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua Riwayat ({data?.records?.length ?? 0})
              </button>
            </div>
          </div>

          {/* Table dengan table-fixed & lebar statis agar stabil 100% */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 table-fixed min-w-[700px]">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="w-[180px] px-6 py-3.5">Tanggal</th>
                  <th className="w-[120px] px-6 py-3.5">Nama</th>
                  <th className="w-[110px] px-6 py-3.5">On Duty</th>
                  <th className="w-[120px] px-6 py-3.5">Off Duty</th>
                  <th className="w-[160px] px-6 py-3.5">Durasi</th>
                  <th className="px-6 py-3.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && !data ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Memuat data absen...
                      </div>
                    </td>
                  </tr>
                ) : displayedRecords.length > 0 ? (
                  displayedRecords.map((item) => (
                    <tr key={item.messageId || item.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-medium text-slate-300 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                          {item.steamName}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-emerald-400 whitespace-nowrap">
                        {item.onDuty}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium whitespace-nowrap">
                        {item.isOngoing ? (
                          <span className="text-amber-400 font-sans text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            Sedang Duty
                          </span>
                        ) : (
                          <span className="text-rose-400">{item.offDuty}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold whitespace-nowrap">
                        {item.isOngoing ? (
                          <span className="text-slate-500 text-xs">-</span>
                        ) : (
                          <span className="text-indigo-300">{item.durationText}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 truncate">
                        {item.note ? `(${item.note})` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                      Tidak ada rekapan absen di periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-500 pt-4 pb-8">
          Duty Tracker &bull; Target: 21 Jam/Minggu &bull; Min. 3 Jam/Hari (WIB)
        </footer>

      </div>
    </div>
  );
}
