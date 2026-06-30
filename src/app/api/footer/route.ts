import { getFooterContent } from '@/lib/footer';

export async function GET() {
  const footer = await getFooterContent();
  return Response.json({ footer });
}
