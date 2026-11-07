import { NextResponse } from 'next/server';

/**
 * Format pesan absen:
 * Nama Steam     : Kawa
 * On Duty        : 12.09
 * Off Duty       : 14.09
 */
function parseDutyMessage(content, createdAt, authorName) {
  const steamMatch = content.match(/Nama\s*Steam\s*:\s*([^\r\n]+)/i);
  const onDutyMatch = content.match(/On\s*Duty\s*:\s*([0-2]?[0-9][.:][0-5][0-9])/i);
  const offDutyMatch = content.match(/Off\s*Duty\s*:\s*([0-2]?[0-9][.:][0-5][0-9])/i);

  if (!onDutyMatch || !offDutyMatch) {
    return null;
  }

  const steamName = steamMatch ? steamMatch[1].trim() : authorName || 'Kawa';
  const onDutyStr = onDutyMatch[1].replace('.', ':');
  const offDutyStr = offDutyMatch[1].replace('.', ':');

  const [onHour, onMin] = onDutyStr.split(':').map(Number);
  const [offHour, offMin] = offDutyStr.split(':').map(Number);

  let onTotalMinutes = onHour * 60 + onMin;
  let offTotalMinutes = offHour * 60 + offMin;

  // Lewat tengah malam (contoh 23.30 ke 01.30)
  if (offTotalMinutes < onTotalMinutes) {
    offTotalMinutes += 24 * 60;
  }

  const durationMinutes = offTotalMinutes - onTotalMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return {
    id: Math.random().toString(36).substring(2, 9),
    steamName,
    onDuty: onDutyStr,
    offDuty: offDutyStr,
    durationMinutes,
    durationText: `${hours} Jam ${minutes > 0 ? minutes + ' Menit' : ''}`.trim(),
    createdAt,
  };
}

// Menghitung rentang Senin 00:00:00 sampai Minggu 23:59:59 minggu ini (WIB / Lokal)
function getMondayToSundayRange(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu

  // Hitung selisih hari ke hari Senin
  // Jika hari Minggu (0), maka mundur 6 hari ke Senin sebelumnya
  const distanceToMonday = day === 0 ? -6 : 1 - day;

  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() + distanceToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0 && mins === 0) return '0 Jam';
  return `${hours} Jam ${mins > 0 ? mins + ' Menit' : ''}`.trim();
}

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const targetSteamName = (process.env.TARGET_STEAM_NAME || 'Kawa').toLowerCase();

  const now = new Date();
  const { startOfWeek, endOfWeek } = getMondayToSundayRange(now);

  const rangeLabel = `${startOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // Mode Demo/Mock jika env belum diset
  if (!token || !channelId) {
    const mockData = [
      {
        id: 'mock-1',
        steamName: 'Kawa',
        onDuty: '12:09',
        offDuty: '14:09',
        durationMinutes: 120,
        durationText: '2 Jam',
        createdAt: new Date().toISOString(), // Minggu ini
      },
      {
        id: 'mock-2',
        steamName: 'Kawa',
        onDuty: '20:15',
        offDuty: '23:45',
        durationMinutes: 210,
        durationText: '3 Jam 30 Menit',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Kemarin
      },
      {
        id: 'mock-3',
        steamName: 'Kawa',
        onDuty: '15:00',
        offDuty: '17:30',
        durationMinutes: 150,
        durationText: '2 Jam 30 Menit',
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), // Minggu lalu
      }
    ];

    const weeklyRecords = mockData.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    });

    const weeklyMinutes = weeklyRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const allTimeMinutes = mockData.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    return NextResponse.json({
      status: 'demo',
      message: 'DISCORD_BOT_TOKEN atau DISCORD_CHANNEL_ID belum dikonfigurasi di Vercel / .env.local. Menampilkan data preview.',
      targetSteamName,
      weekRange: rangeLabel,
      summary: {
        weeklyHours: formatMinutes(weeklyMinutes),
        weeklySessions: weeklyRecords.length,
        weeklyMinutes,
        allTimeHours: formatMinutes(allTimeMinutes),
        allTimeSessions: mockData.length,
      },
      records: mockData,
      weeklyRecords,
    });
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=100`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: 'Gagal mengambil pesan dari Discord', details: errText },
        { status: response.status }
      );
    }

    const messages = await response.json();
    const allRecords = [];

    for (const msg of messages) {
      if (!msg.content) continue;
      const parsed = parseDutyMessage(msg.content, msg.timestamp, msg.author?.username);
      if (parsed) {
        if (targetSteamName === 'all' || parsed.steamName.toLowerCase().includes(targetSteamName)) {
          allRecords.push({
            ...parsed,
            discordAuthor: msg.author?.username,
            messageId: msg.id,
          });
        }
      }
    }

    // Filter khusus Senin - Minggu (Minggu ini)
    const weeklyRecords = allRecords.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    });

    const weeklyMinutes = weeklyRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const allTimeMinutes = allRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    return NextResponse.json({
      status: 'success',
      targetSteamName,
      weekRange: rangeLabel,
      summary: {
        weeklyHours: formatMinutes(weeklyMinutes),
        weeklySessions: weeklyRecords.length,
        weeklyMinutes,
        allTimeHours: formatMinutes(allTimeMinutes),
        allTimeSessions: allRecords.length,
      },
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
