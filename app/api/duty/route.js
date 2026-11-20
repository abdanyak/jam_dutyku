import { NextResponse } from 'next/server';

/**
 * Format pesan absen Discord yang dideteksi:
 * 
 * Nama Steam  : Kawa
 * On Duty     : 22.13
 * Off Duty    : 22.52 (duar)
 */
function parseDutyMessage(content, createdAt, authorName) {
  // 1. Bersihkan pembungkus code block markdown (```)
  const cleanContent = content.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');

  // 2. Ekstrak Nama Steam
  const steamMatch = cleanContent.match(/Nama\s*Steam\s*:\s*([^\r\n]+)/i);
  
  // 3. Ekstrak On Duty (contoh: 00.11, 23.57, 12:09)
  const onDutyMatch = cleanContent.match(/On\s*Duty\s*:\s*([0-2]?[0-9][.:][0-5][0-9])/i);

  if (!onDutyMatch) {
    return null;
  }

  const steamName = steamMatch ? steamMatch[1].trim() : (authorName || 'Unknown');
  const onDutyStr = onDutyMatch[1].replace('.', ':');

  // 4. Ekstrak Off Duty
  const offDutyMatch = cleanContent.match(/Off\s*Duty\s*:\s*([0-2]?[0-9][.:][0-5][0-9])?/i);
  const rawOffDuty = offDutyMatch && offDutyMatch[1] ? offDutyMatch[1].replace('.', ':') : null;

  // Catatan dalam kurung (misal: duar)
  const noteMatch = cleanContent.match(/Off\s*Duty\s*:[^\r\n]*?\(([^)]+)\)/i);
  const note = noteMatch ? noteMatch[1].trim() : null;

  // Jika belum Off Duty
  if (!rawOffDuty) {
    return {
      id: Math.random().toString(36).substring(2, 9),
      steamName,
      onDuty: onDutyStr,
      offDuty: 'Sedang Duty 🟢',
      durationMinutes: 0,
      durationText: 'Aktif',
      isOngoing: true,
      note,
      createdAt,
    };
  }

  const offDutyStr = rawOffDuty;
  const [onHour, onMin] = onDutyStr.split(':').map(Number);
  const [offHour, offMin] = offDutyStr.split(':').map(Number);

  let onTotalMinutes = onHour * 60 + onMin;
  let offTotalMinutes = offHour * 60 + offMin;

  // Penanganan lewat tengah malam (contoh: On 23:57 -> Off 02:32)
  if (offTotalMinutes < onTotalMinutes) {
    offTotalMinutes += 24 * 60;
  }

  const durationMinutes = offTotalMinutes - onTotalMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  let durationText = '';
  if (hours > 0 && minutes > 0) {
    durationText = `${hours} Jam ${minutes} Menit`;
  } else if (hours > 0) {
    durationText = `${hours} Jam`;
  } else {
    durationText = `${minutes} Menit`;
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    steamName,
    onDuty: onDutyStr,
    offDuty: offDutyStr,
    durationMinutes,
    durationText,
    isOngoing: false,
    note,
    createdAt,
  };
}

/**
 * Konversi timestamp ISO ke waktu Indonesia Barat (UTC+7)
 */
function getWIBDate(dateInput) {
  const d = new Date(dateInput);
  // Tambah 7 jam ke UTC untuk mendapatkan waktu WIB absolut
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (7 * 60 * 60 * 1000));
}

/**
 * Menghitung batas Senin 00:00:00 s/d Minggu 23:59:59 berdasarkan WIB (UTC+7)
 */
function getWIBMondayToSundayRange(referenceDate = new Date()) {
  const nowWIB = getWIBDate(referenceDate);
  const day = nowWIB.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu

  // Hitung selisih hari menuju hari Senin
  const distanceToMonday = day === 0 ? -6 : 1 - day;

  // Senin 00:00:00 WIB
  const startWIB = new Date(nowWIB);
  startWIB.setDate(nowWIB.getDate() + distanceToMonday);
  startWIB.setHours(0, 0, 0, 0);

  // Minggu 23:59:59.999 WIB
  const endWIB = new Date(startWIB);
  endWIB.setDate(startWIB.getDate() + 6);
  endWIB.setHours(23, 59, 59, 999);

  return { startWIB, endWIB, nowWIB };
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0 && mins === 0) return '0 Jam';
  if (hours > 0 && mins > 0) return `${hours} Jam ${mins} Menit`;
  if (hours > 0) return `${hours} Jam`;
  return `${mins} Menit`;
}

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_USER_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const targetSteamName = process.env.TARGET_STEAM_NAME || 'Kawa';
  const weeklyTargetHours = Number(process.env.WEEKLY_TARGET_HOURS) || 21;
  const dailyTargetHours = Number(process.env.DAILY_TARGET_HOURS) || 3;

  const weeklyTargetMinutes = weeklyTargetHours * 60;
  const dailyTargetMinutes = dailyTargetHours * 60;

  const { startWIB, endWIB, nowWIB } = getWIBMondayToSundayRange(new Date());

  // Batas hari ini WIB (00:00:00 s/d 23:59:59.999)
  const todayStartWIB = new Date(nowWIB);
  todayStartWIB.setHours(0, 0, 0, 0);
  const todayEndWIB = new Date(nowWIB);
  todayEndWIB.setHours(23, 59, 59, 999);

  const rangeLabel = `${startWIB.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })} - ${endWIB.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}`;

  const defaultTargets = {
    weekly: {
      targetHours: weeklyTargetHours,
      targetMinutes: weeklyTargetMinutes,
      currentMinutes: 0,
      currentHoursText: '0 Jam',
      remainingMinutes: weeklyTargetMinutes,
      remainingText: formatMinutes(weeklyTargetMinutes),
      isAchieved: false,
      percentage: 0,
    },
    daily: {
      targetHours: dailyTargetHours,
      targetMinutes: dailyTargetMinutes,
      currentMinutes: 0,
      currentHoursText: '0 Jam',
      remainingMinutes: dailyTargetMinutes,
      remainingText: formatMinutes(dailyTargetMinutes),
      isAchieved: false,
      percentage: 0,
    },
  };

  if (!token || !channelId) {
    return NextResponse.json({
      status: 'demo',
      message: 'DISCORD_BOT_TOKEN / DISCORD_USER_TOKEN atau DISCORD_CHANNEL_ID belum dikonfigurasi.',
      targetSteamName,
      weeklyTargetHours,
      dailyTargetHours,
      weekRange: rangeLabel,
      uniquePlayers: ['Kawa'],
      playerSummaries: [
        {
          name: 'Kawa',
          weeklyMinutes: 0,
          weeklyHoursText: '0 Jam',
          weeklySessions: 0,
          weeklyRemainingMinutes: weeklyTargetMinutes,
          weeklyRemainingText: formatMinutes(weeklyTargetMinutes),
          weeklyAchieved: false,
          weeklyPercentage: 0,
          todayMinutes: 0,
          todayHoursText: '0 Jam',
          todaySessions: 0,
          dailyRemainingMinutes: dailyTargetMinutes,
          dailyRemainingText: formatMinutes(dailyTargetMinutes),
          dailyAchieved: false,
          dailyPercentage: 0,
          allTimeMinutes: 0,
          allTimeHoursText: '0 Jam',
          allTimeSessions: 0,
          isCurrentlyDuty: false,
        }
      ],
      summary: {
        weeklyHours: '0 Jam',
        weeklySessions: 0,
        weeklyMinutes: 0,
        todayHours: '0 Jam',
        todaySessions: 0,
        todayMinutes: 0,
        allTimeHours: '0 Jam',
        allTimeSessions: 0,
      },
      targets: defaultTargets,
      todayRecords: [],
      records: [],
      weeklyRecords: [],
    });
  }

  try {
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    let authHeader = cleanToken;
    // Jika bot token belum memiliki prefix 'Bot ', tambahkan otomatis
    if (process.env.DISCORD_BOT_TOKEN && !cleanToken.toLowerCase().startsWith('bot ') && !process.env.DISCORD_USER_TOKEN) {
      authHeader = `Bot ${cleanToken}`;
    }

    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId.trim()}/messages?limit=100`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: 'Gagal membaca channel Discord', details: errText, status: response.status },
        { status: response.status }
      );
    }

    const messages = await response.json();
    const allRecords = [];

    // Baca dan parse seluruh pesan duty dari semua player di channel
    for (const msg of messages) {
      if (!msg.content) continue;
      const authorName = msg.author?.global_name || msg.author?.username || 'Unknown';
      const parsed = parseDutyMessage(msg.content, msg.timestamp, authorName);
      
      if (parsed) {
        allRecords.push({
          ...parsed,
          discordAuthor: authorName,
          messageId: msg.id,
        });
      }
    }

    // Ekstrak daftar nama player unik yang ditemukan
    const playerMap = new Map();
    for (const rec of allRecords) {
      const key = rec.steamName.toLowerCase().trim();
      if (!playerMap.has(key)) {
        playerMap.set(key, rec.steamName.trim());
      }
    }
    const uniquePlayers = Array.from(playerMap.values()).sort((a, b) => a.localeCompare(b));

    // Filter menggunakan WAKTU INDONESIA BARAT (WIB)
    // 1. Rekap Minggu Ini (Senin 00:00 - Minggu 23:59 WIB)
    const weeklyRecords = allRecords.filter(item => {
      const itemWIB = getWIBDate(item.createdAt);
      return itemWIB >= startWIB && itemWIB <= endWIB;
    });

    // 2. Rekap Hari Ini (00:00 - 23:59 WIB)
    const todayRecords = weeklyRecords.filter(item => {
      const itemWIB = getWIBDate(item.createdAt);
      return itemWIB >= todayStartWIB && itemWIB <= todayEndWIB;
    });

    // Hitung ringkasan statistik per player secara otomatis
    const playerSummaries = uniquePlayers.map(name => {
      const key = name.toLowerCase().trim();
      const pRecords = allRecords.filter(r => r.steamName.toLowerCase().trim() === key);
      const pWeekly = pRecords.filter(r => {
        const d = getWIBDate(r.createdAt);
        return d >= startWIB && d <= endWIB;
      });
      const pToday = pWeekly.filter(r => {
        const d = getWIBDate(r.createdAt);
        return d >= todayStartWIB && d <= todayEndWIB;
      });

      const pWeeklyMinutes = pWeekly.reduce((sum, r) => sum + r.durationMinutes, 0);
      const pTodayMinutes = pToday.reduce((sum, r) => sum + r.durationMinutes, 0);
      const pAllTimeMinutes = pRecords.reduce((sum, r) => sum + r.durationMinutes, 0);

      const pWeeklyRemaining = Math.max(0, weeklyTargetMinutes - pWeeklyMinutes);
      const pDailyRemaining = Math.max(0, dailyTargetMinutes - pTodayMinutes);

      return {
        name,
        weeklyMinutes: pWeeklyMinutes,
        weeklyHoursText: formatMinutes(pWeeklyMinutes),
        weeklySessions: pWeekly.filter(r => !r.isOngoing).length,
        weeklyRemainingMinutes: pWeeklyRemaining,
        weeklyRemainingText: pWeeklyRemaining === 0 ? 'Target Tercapai 🎉' : formatMinutes(pWeeklyRemaining),
        weeklyAchieved: pWeeklyMinutes >= weeklyTargetMinutes,
        weeklyPercentage: Math.min(100, Math.round((pWeeklyMinutes / weeklyTargetMinutes) * 100)),

        todayMinutes: pTodayMinutes,
        todayHoursText: formatMinutes(pTodayMinutes),
        todaySessions: pToday.filter(r => !r.isOngoing).length,
        dailyRemainingMinutes: pDailyRemaining,
        dailyRemainingText: pDailyRemaining === 0 ? 'Target Tercapai 🎉' : formatMinutes(pDailyRemaining),
        dailyAchieved: pTodayMinutes >= dailyTargetMinutes,
        dailyPercentage: Math.min(100, Math.round((pTodayMinutes / dailyTargetMinutes) * 100)),

        allTimeMinutes: pAllTimeMinutes,
        allTimeHoursText: formatMinutes(pAllTimeMinutes),
        allTimeSessions: pRecords.filter(r => !r.isOngoing).length,
        isCurrentlyDuty: pRecords.some(r => r.isOngoing),
      };
    });

    const weeklyMinutes = weeklyRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const todayMinutes = todayRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const allTimeMinutes = allRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    // Hitung sisa/kekurangan target keseluruhan tim
    const weeklyRemainingMinutes = Math.max(0, weeklyTargetMinutes - weeklyMinutes);
    const dailyRemainingMinutes = Math.max(0, dailyTargetMinutes - todayMinutes);

    const targets = {
      weekly: {
        targetHours: weeklyTargetHours,
        targetMinutes: weeklyTargetMinutes,
        currentMinutes: weeklyMinutes,
        currentHoursText: formatMinutes(weeklyMinutes),
        remainingMinutes: weeklyRemainingMinutes,
        remainingText: weeklyRemainingMinutes === 0 ? 'Target Tercapai 🎉' : formatMinutes(weeklyRemainingMinutes),
        isAchieved: weeklyMinutes >= weeklyTargetMinutes,
        percentage: Math.min(100, Math.round((weeklyMinutes / weeklyTargetMinutes) * 100)),
      },
      daily: {
        targetHours: dailyTargetHours,
        targetMinutes: dailyTargetMinutes,
        currentMinutes: todayMinutes,
        currentHoursText: formatMinutes(todayMinutes),
        remainingMinutes: dailyRemainingMinutes,
        remainingText: dailyRemainingMinutes === 0 ? 'Target Tercapai 🎉' : formatMinutes(dailyRemainingMinutes),
        isAchieved: todayMinutes >= dailyTargetMinutes,
        percentage: Math.min(100, Math.round((todayMinutes / dailyTargetMinutes) * 100)),
      },
    };

    return NextResponse.json({
      status: 'success',
      targetSteamName,
      weeklyTargetHours,
      dailyTargetHours,
      weekRange: rangeLabel,
      uniquePlayers,
      playerSummaries,
      summary: {
        weeklyHours: formatMinutes(weeklyMinutes),
        weeklySessions: weeklyRecords.filter(r => !r.isOngoing).length,
        weeklyMinutes,
        todayHours: formatMinutes(todayMinutes),
        todaySessions: todayRecords.filter(r => !r.isOngoing).length,
        todayMinutes,
        allTimeHours: formatMinutes(allTimeMinutes),
        allTimeSessions: allRecords.filter(r => !r.isOngoing).length,
      },
      targets,
      todayRecords,
      weeklyRecords,
      records: allRecords,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message },
      { status: 500 }
    );
  }
}
