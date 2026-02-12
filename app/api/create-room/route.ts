import { NextResponse } from 'next/server';

export async function POST() {
  const roomId = crypto.randomUUID();

  return NextResponse.json({ roomId });
}
