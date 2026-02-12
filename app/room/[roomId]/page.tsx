interface RoomPageProps {
  params: {
    roomId: string;
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Room {params.roomId}</h1>
      <p className="text-slate-600 dark:text-slate-300">
        Dynamic room page scaffold.
      </p>
    </main>
  );
}
