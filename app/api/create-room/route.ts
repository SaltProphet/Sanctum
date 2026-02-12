import { NextResponse } from 'next/server';

export async function POST() {
  // Generate a unique room name using timestamp and random string
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  const roomName = `room-${timestamp}-${randomPart}`;

  // In a real implementation, you would store the room data in a database
  // with an expiry time of 30 minutes from now
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return NextResponse.json({
    roomName,
    expiresAt,
  });
}
