import { NextResponse } from 'next/server';

/**
 * Format pesan absen Discord yang dideteksi:
 * 
 * Nama Steam  : Kawa
 * On Duty     : 22.13
 * Off Duty    : 22.52 (duar)
 */
function parseDutyMessage(content, createdAt, authorName) {
  // 1. Bersihkan karakter pembungkus kode (```) jika ada
  const cleanContent = content.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');

  // 2. Regex untuk Nama Steam
  const steamMatch = cleanContent.match(/Nama\s*Steam\s*:\s*([^\r\n]+)/i);
  
  // 3. Regex On Duty: misal 22.13 atau 22:13
  const onDutyMatch = cleanContent.match(/On\s*Duty\s*:\s*([0-2]?[0-9][.:][0-5][0-9])/i);

  if (!onDutyMatch) {
    return null;
  }

  const steamName = steamMatch ? steamMatch[1].trim() : (authorName || 'Kawa');
  const onDutyStr = onDutyMatch[1].replace('.', ':');

  // 4. Regex Off Duty: bisa 22.52, bisa ada kata tambahan misal (duar), atau kosong
  const offDutyMatch = cleanContent.match(/Off\s*Duty\s*:\s*([0-2]?[0-9][.:][0-5][0-9])?/i);
  const rawOffDuty = offDutyMatch && offDutyMatch[1] ? offDutyMatch[1].replace('.', ':') : null;

  // Catatan keterangan di dalam kurung jika ada (misal: duar)
  const noteMatch = cleanContent.match(/Off\s*Duty\s*:[^\r\n]*?\(([^)]+)\)/i);
  const note = noteMatch ? noteMatch[1].trim() : null;

  // Jika Off Duty masih kosong (sedang on duty)
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

  // Lewat tengah malam (contoh On 23:57 -> Off 02:32)
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

// Menghitung rentang Senin 00:00:00 s/d Minggu 23:59:59 (WIB)
function getMondayToSundayRange(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();

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
  if (hours > 0 && mins > 0) return `${hours} Jam ${mins} Menit`;
  if (hours > 0) return `${hours} Jam`;
  return `${mins} Menit`;
}

export async function GET() {
  const token = process.env.DISCORD_USER_TOKEN || process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  const now = new Date();
  const { startOfWeek, endOfWeek } = getMondayToSundayRange(now);
  const rangeLabel = `${startOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  if (!token || !channelId) {
    return NextResponse.json({
      status: 'demo',
      message: 'DISCORD_USER_TOKEN atau DISCORD_CHANNEL_ID belum dikonfigurasi di Vercel.',
      targetSteamName: 'Kawa',
      weekRange: rangeLabel,
      summary: {
        weeklyHours: '0 Jam',
        weeklySessions: 0,
        weeklyMinutes: 0,
        allTimeHours: '0 Jam',
        allTimeSessions: 0,
      },
      records: [],
      weeklyRecords: [],
    });
  }

  try {
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    const authHeader = cleanToken.toLowerCase().startsWith('bot ') ? cleanToken : cleanToken;

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

    for (const msg of messages) {
      if (!msg.content) continue;
      const parsed = parseDutyMessage(msg.content, msg.timestamp, msg.author?.username);
      
      // FILTER KETAT KHUSUS "KAWA":
      if (parsed) {
        const isSteamKawa = parsed.steamName.toLowerCase().includes('kawa');
        const isAuthorKawa = (msg.author?.username || '').toLowerCase().includes('kawa');

        if (isSteamKawa || isAuthorKawa) {
          allRecords.push({
            ...parsed,
            steamName: 'Kawa',
            discordAuthor: msg.author?.username,
            messageId: msg.id,
          });
        }
      }
    }

    // Filter khusus rentang Senin - Minggu minggu ini
    const weeklyRecords = allRecords.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    });

    const weeklyMinutes = weeklyRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const allTimeMinutes = allRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    return NextResponse.json({
      status: 'success',
      targetSteamName: 'Kawa',
      weekRange: rangeLabel,
      summary: {
        weeklyHours: formatMinutes(weeklyMinutes),
        weeklySessions: weeklyRecords.filter(r => !r.isOngoing).length,
        weeklyMinutes,
        allTimeHours: formatMinutes(allTimeMinutes),
        allTimeSessions: allRecords.filter(r => !r.isOngoing).length,
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
