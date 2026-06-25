import React from 'react';

interface ReactNativeAsset {
  file?: File;
  uri: string;
  name?: string;
  mimeType?: string;
}

interface UploadInput {
  reactNativeAsset?: ReactNativeAsset;
  file?: File;
  url?: string;
  base64?: string;
  buffer?: Buffer;
}

interface UploadResult {
  url?: string;
  mimeType?: string | null;
  error?: string;
}

interface UploadHookResult {
  loading: boolean;
}

const UPLOAD_ENDPOINT = '/api/upload';

function useUpload(): [(input: UploadInput) => Promise<UploadResult>, UploadHookResult] {
  const [loading, setLoading] = React.useState(false);
  const upload = React.useCallback(async (input: UploadInput): Promise<UploadResult> => {
    try {
      setLoading(true);
      let response: Response | undefined;
      if ('file' in input && input.file) {
        const formData = new FormData();
        formData.append('file', input.file);
        response = await fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          body: formData,
        });
      } else if ('url' in input) {
        response = await fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input.url }),
        });
      } else if ('base64' in input) {
        response = await fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: input.base64 }),
        });
      } else {
        response = await fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: input.buffer as unknown as BodyInit,
        });
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 413) {
          throw new Error('Upload failed: File too large.');
        }
        throw new Error(data.error || 'Upload failed');
      }
      const data = await response.json();
      return { url: data.url, mimeType: data.mimeType || null };
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === 'string') {
        return { error: uploadError };
      }
      return { error: 'Upload failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export default useUpload;
