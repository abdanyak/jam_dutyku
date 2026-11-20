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
  Flame,
  Users,
  ChevronRight
} from 'lucide-react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [viewFilter, setViewFilter] = useState('weekly');
  const [selectedPlayer, setSelectedPlayer] = useState('all');

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

  // Ambil data statistik aktif (berdasarkan player terpilih atau akumulasi semua player)
  const activePlayerSummary = selectedPlayer === 'all'
    ? null
    : data?.playerSummaries?.find(p => p.name.toLowerCase() === selectedPlayer.toLowerCase());

  const weeklyTargetHours = data?.weeklyTargetHours || 21;
  const dailyTargetHours = data?.dailyTargetHours || 3;

  const currentWeeklyHours = activePlayerSummary 
    ? activePlayerSummary.weeklyHoursText 
    : (data?.summary?.weeklyHours || '0 Jam');
  const currentWeeklySessions = activePlayerSummary 
    ? activePlayerSummary.weeklySessions 
    : (data?.summary?.weeklySessions ?? 0);
  const isWeeklyAchieved = activePlayerSummary 
    ? activePlayerSummary.weeklyAchieved 
    : (data?.targets?.weekly?.isAchieved ?? false);
  const weeklyRemainingText = activePlayerSummary 
    ? activePlayerSummary.weeklyRemainingText 
    : (data?.targets?.weekly?.remainingText || `${weeklyTargetHours} Jam`);
  const weeklyPercentage = activePlayerSummary 
    ? activePlayerSummary.weeklyPercentage 
    : (data?.targets?.weekly?.percentage ?? 0);

  const currentDailyHours = activePlayerSummary 
    ? activePlayerSummary.todayHoursText 
    : (data?.summary?.todayHours || '0 Jam');
  const currentDailySessions = activePlayerSummary 
    ? activePlayerSummary.todaySessions 
    : (data?.summary?.todaySessions ?? 0);
  const isDailyAchieved = activePlayerSummary 
    ? activePlayerSummary.dailyAchieved 
    : (data?.targets?.daily?.isAchieved ?? false);
  const dailyRemainingText = activePlayerSummary 
    ? activePlayerSummary.dailyRemainingText 
    : (data?.targets?.daily?.remainingText || `${dailyTargetHours} Jam`);
  const dailyPercentage = activePlayerSummary 
    ? activePlayerSummary.dailyPercentage 
    : (data?.targets?.daily?.percentage ?? 0);

  const isCurrentlyDuty = activePlayerSummary
    ? activePlayerSummary.isCurrentlyDuty
    : data?.records?.some(r => r.isOngoing);

  const allTimeHours = activePlayerSummary
    ? activePlayerSummary.allTimeHoursText
    : (data?.summary?.allTimeHours || '0 Jam');
  const allTimeSessions = activePlayerSummary
    ? activePlayerSummary.allTimeSessions
    : (data?.summary?.allTimeSessions ?? 0);

  // Filter tabel berdasarkan tab waktu & filter player
  const baseRecords = viewFilter === 'today'
    ? (data?.todayRecords || [])
    : viewFilter === 'weekly'
    ? (data?.weeklyRecords || [])
    : (data?.records || []);

  const displayedRecords = selectedPlayer === 'all'
    ? baseRecords
    : baseRecords.filter(r => (r.steamName || '').toLowerCase() === selectedPlayer.toLowerCase());

  const playerList = data?.uniquePlayers || [];

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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Duty Tracker
                </h1>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium">
                  Target: {weeklyTargetHours} Jam/Minggu &bull; Min {dailyTargetHours} Jam/Hari
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

          {/* Action Header: Player Dropdown & Refresh */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Player Selector Dropdown */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
              <Users className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="text-xs text-slate-400 font-medium">Player:</span>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-sm pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">
                  Semua Player ({playerList.length})
                </option>
                {playerList.map((name) => (
                  <option key={name} value={name} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
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

        {/* Quick Player Filter Chips (Bila ada lebih dari 1 player) */}
        {playerList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 whitespace-nowrap font-medium">Pilih Cepat:</span>
            <button
              onClick={() => setSelectedPlayer('all')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap font-medium ${
                selectedPlayer === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Semua Player
            </button>
            {playerList.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedPlayer(name)}
                className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap font-medium ${
                  selectedPlayer.toLowerCase() === name.toLowerCase()
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Banner Penanda Player Aktif */}
        {selectedPlayer !== 'all' && (
          <div className="px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs">
            <span className="text-indigo-200">
              Menampilkan data & target khusus untuk player: <strong className="text-white text-sm">{selectedPlayer}</strong>
            </span>
            <button
              onClick={() => setSelectedPlayer('all')}
              className="text-indigo-300 hover:text-white underline font-medium ml-2"
            >
              Lihat Semua Player
            </button>
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
                  Target Mingguan ({weeklyTargetHours} Jam)
                </span>
              </div>
              {isWeeklyAchieved ? (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Target Tercapai 🎉
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Kurang: {weeklyRemainingText}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-black text-white">
                  {currentWeeklyHours}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dari target {weeklyTargetHours} Jam minggu ini {selectedPlayer !== 'all' ? `(${selectedPlayer})` : '(Tim)'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-400 font-mono">
                  {weeklyPercentage}%
                </div>
                <p className="text-xs text-slate-400">
                  {currentWeeklySessions} sesi selesai
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    isWeeklyAchieved 
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' 
                      : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                  }`}
                  style={{ width: `${Math.min(100, weeklyPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  {isWeeklyAchieved ? 'Target mingguan sudah tercukupi!' : 'Sisa minggu ini'}
                </span>
                <span className={`font-semibold ${isWeeklyAchieved ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {weeklyRemainingText}
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
                  Target Hari Ini (Min. {dailyTargetHours} Jam)
                </span>
              </div>
              {isDailyAchieved ? (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Target Tercapai 🎉
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Kurang: {dailyRemainingText}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-black text-white">
                  {currentDailyHours}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dari target minimal {dailyTargetHours} Jam hari ini
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {dailyPercentage}%
                </div>
                <p className="text-xs text-slate-400">
                  {currentDailySessions} sesi hari ini
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    isDailyAchieved 
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, dailyPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  {isDailyAchieved ? 'Target harian sudah beres!' : 'Sisa hari ini'}
                </span>
                <span className={`font-semibold ${isDailyAchieved ? 'text-emerald-400' : 'text-rose-300'}`}>
                  {dailyRemainingText}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* KARTU RINGKASAN SELURUH PLAYER (Tampil saat mode 'Semua Player') */}
        {selectedPlayer === 'all' && data?.playerSummaries?.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Ringkasan Target Setiap Player ({data.playerSummaries.length} Player)
              </h2>
              <span className="text-xs text-slate-400">
                Klik kartu player untuk melihat detail lengkap
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.playerSummaries.map((p) => (
                <div
                  key={p.name}
                  onClick={() => setSelectedPlayer(p.name)}
                  className="p-4 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-950/20 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                      {p.name}
                    </span>
                    {p.isCurrentlyDuty ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        On Duty
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Off Duty
                      </span>
                    )}
                  </div>

                  {/* Mingguan */}
                  <div className="space-y-1 my-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Minggu Ini:</span>
                      <span className="font-semibold text-slate-200">{p.weeklyHoursText} / {weeklyTargetHours} Jam</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.weeklyAchieved ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, p.weeklyPercentage)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-right font-medium">
                      {p.weeklyAchieved ? (
                        <span className="text-emerald-400">Target Tercapai 🎉</span>
                      ) : (
                        <span className="text-amber-400">Kurang: {p.weeklyRemainingText}</span>
                      )}
                    </div>
                  </div>

                  {/* Hari Ini */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Hari Ini: {p.todayHoursText}</span>
                    <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center text-[11px] font-semibold">
                      Detail <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Total Keseluruhan</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {allTimeHours}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dari {allTimeSessions} sesi selesai tercatat
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Player Terpilih</span>
              <User className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white truncate">
              {selectedPlayer === 'all' ? 'SEMUA PLAYER' : selectedPlayer.toUpperCase()}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedPlayer === 'all' ? `Total ${playerList.length} player aktif` : 'Filter individu'}
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
              {isCurrentlyDuty ? 'Sesi absen masih aktif' : 'Belum ada sesi aktif'}
            </p>
          </div>
        </div>

        {/* Table Box - FIXED COLUMN WIDTH */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Riwayat Absen {selectedPlayer !== 'all' ? `(${selectedPlayer})` : '(Semua Player)'}
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
                Hari Ini
              </button>
              <button
                onClick={() => setViewFilter('weekly')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewFilter === 'weekly'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setViewFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua Riwayat
              </button>
            </div>
          </div>

          {/* Table dengan table-fixed & lebar statis agar stabil 100% */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 table-fixed min-w-[700px]">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="w-[180px] px-6 py-3.5">Tanggal</th>
                  <th className="w-[140px] px-6 py-3.5">Nama Player</th>
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
                        <button
                          onClick={() => setSelectedPlayer(item.steamName)}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
                          title="Klik untuk filter player ini"
                        >
                          {item.steamName}
                        </button>
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
                      Tidak ada rekapan absen untuk {selectedPlayer !== 'all' ? selectedPlayer : 'periode ini'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-500 pt-4 pb-8">
          Duty Tracker &bull; Multi-Player Support &bull; Target: {weeklyTargetHours} Jam/Minggu &bull; Min. {dailyTargetHours} Jam/Hari (WIB)
        </footer>

      </div>
    </div>
  );
}
