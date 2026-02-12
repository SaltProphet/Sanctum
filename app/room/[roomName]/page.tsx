'use client';

import { useParams } from 'next/navigation';

export default function RoomPage() {
  const params = useParams();
  const roomName = params.roomName as string;

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <section className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl text-center">
        <h1 className="text-2xl font-bold mb-4 text-neon-green">Room Active</h1>
        <p className="text-slate-300 mb-6">
          Welcome to room: <span className="font-mono text-neon-green">{roomName}</span>
        </p>
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
        <p className="text-xs text-red-500 mt-6 font-semibold">
          This room will expire 30 minutes after creation
        </p>
      </section>
    </main>
  );
}
