const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function getUploadcarePublicKey() {
  return (
    process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
    process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
    ''
  );
}

function toDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
}

async function uploadToUploadcare(file: File, publicKey: string) {
  const form = new FormData();
  form.append('UPLOADCARE_PUB_KEY', publicKey);
  form.append('UPLOADCARE_STORE', '1');
  form.append('file', file);

  const res = await fetch('https://upload.uploadcare.com/base/', {
    method: 'POST',
    body: form,
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Uploadcare upload failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = JSON.parse(text) as { file?: string };
  if (!data.file) throw new Error('Uploadcare did not return a file id');

  return {
    url: `https://ucarecdn.com/${data.file}/`,
    mimeType: file.type || null,
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const publicKey = getUploadcarePublicKey();

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return Response.json({ error: 'file is required' }, { status: 400 });
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return Response.json({ error: 'File too large' }, { status: 413 });
      }

      if (publicKey) {
        const result = await uploadToUploadcare(file, publicKey);
        return Response.json(result);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      return Response.json({
        url: toDataUrl(buffer, file.type || 'application/octet-stream'),
        mimeType: file.type || null,
      });
    }

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (typeof body.url === 'string' && body.url.trim()) {
        return Response.json({ url: body.url, mimeType: null });
      }

      if (typeof body.base64 === 'string' && body.base64.trim()) {
        const base64 = body.base64;
        const url = base64.startsWith('data:')
          ? base64
          : `data:application/octet-stream;base64,${base64}`;
        return Response.json({ url, mimeType: null });
      }

      return Response.json({ error: 'url or base64 is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return Response.json({ error: 'File too large' }, { status: 413 });
    }

    return Response.json({
      url: toDataUrl(buffer, contentType || 'application/octet-stream'),
      mimeType: contentType || null,
    });
  } catch (error) {
    console.error('[upload] failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
