import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST() {
  // Generate a unique room name using timestamp and cryptographically secure random string
  const timestamp = Date.now();
  const randomPart = randomBytes(6).toString('hex');
  const roomName = `room-${timestamp}-${randomPart}`;

  // In a real implementation, you would store the room data in a database
  // with an expiry time of 30 minutes from now
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return NextResponse.json({
    roomName,
    expiresAt,
  });
}
