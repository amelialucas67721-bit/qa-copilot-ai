// Server-side endpoint that safely exposes the Uploadcare public key.
// EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY is available in the Node.js server runtime
// but NOT in the browser bundle — this endpoint bridges that gap.
export async function POST() {
  const key = process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY || '';
  if (!key) {
    console.error('[upload/presign] EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY is not set');
    return Response.json({ error: 'Upload not configured' }, { status: 500 });
  }
  return Response.json({ publicKey: key });
}

export async function GET() {
  const key = process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY || '';
  if (!key) {
    return Response.json({ error: 'Upload not configured' }, { status: 500 });
  }
  return Response.json({ publicKey: key });
}
