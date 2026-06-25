// Returns the Uploadcare public key so the frontend can upload directly.
// Safe to expose — this is a public key by design.
export async function GET() {
  const key =
    process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
    process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
    '';

  if (!key) {
    console.error(
      '[upload/key] Uploadcare public key not found. ' +
        'Set NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY or EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY.'
    );
    return Response.json({ error: 'Upload not configured' }, { status: 500 });
  }
  return Response.json({ publicKey: key });
}
