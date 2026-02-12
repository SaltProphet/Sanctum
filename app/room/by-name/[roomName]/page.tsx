import { isValidRoomName } from '@/lib/roomName';
import { isPassType } from '@/lib/passType';
import { DAILY_ROOMS_URL } from '@/lib/dailyConfig';
import { tryParseJson } from '@/lib/jsonUtils';
import { redirect } from 'next/navigation';

type DailyRoomDetailsResponse = {
  name?: unknown;
  properties?: {
    pass_type?: unknown;
    pass_expires_at?: unknown;
    exp?: unknown;
  };
};

type RoomByNamePageProps = {
  params: {
    roomName: string;
  };
};

async function getRoomMetadata(roomName: string): Promise<DailyRoomDetailsResponse | null> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return null;
  }

  let response: Response;

  try {
    response = await fetch(`${DAILY_ROOMS_URL}/${roomName}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = await tryParseJson(response);

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as DailyRoomDetailsResponse;
}

function getRoomExpiration(details: DailyRoomDetailsResponse): number | null {
  const passExpiresAt = details.properties?.pass_expires_at;
  const dailyExp = details.properties?.exp;

  if (typeof passExpiresAt === 'number') {
    return passExpiresAt;
  }

  if (typeof dailyExp === 'number') {
    return dailyExp;
  }

  return null;
}

export default async function RoomPage({ params }: RoomByNamePageProps) {
  const roomName = params.roomName;

  if (!roomName || !isValidRoomName(roomName)) {
    redirect('/dashboard');
  }

  const roomDetails = await getRoomMetadata(roomName);

  if (!roomDetails || roomDetails.name !== roomName) {
    redirect('/dashboard');
  }

  const expirationEpochSeconds = getRoomExpiration(roomDetails);

  if (!expirationEpochSeconds || Date.now() >= expirationEpochSeconds * 1000) {
    redirect('/dashboard');
  }

  const passType = roomDetails.properties?.pass_type;
  const passLabel = isPassType(passType) 
    ? passType === 'marathon' ? 'Marathon' : 'Quickie'
    : 'Unknown';

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <section className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl text-center">
        <h1 className="text-2xl font-bold mb-4 text-neon-green">Room Active</h1>
        <p className="text-slate-300 mb-2">
          Welcome to room: <span className="font-mono text-neon-green">{roomName}</span>
        </p>
        <p className="text-slate-400 mb-6">Pass type: {passLabel}</p>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-400">
            This is a placeholder for the room session. In a full implementation, this would include:
          </p>
          <ul className="text-left text-sm text-slate-400 mt-3 space-y-2">
            <li>• Video/audio conferencing</li>
            <li>• Chat functionality</li>
            <li>• Screen sharing</li>
            <li>• Collaborative tools</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
