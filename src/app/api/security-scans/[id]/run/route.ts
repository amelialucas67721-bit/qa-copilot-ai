import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { getAIIntegrationUrl } from '@/app/api/utils/ai';

// NOTE: Gemini URL is built INSIDE the handler — not at module level.
// NEXT_PUBLIC_* vars can be empty/undefined at cold-start module evaluation time,
// so integration URLs are built inside the handler with a localhost fallback.

interface Finding {
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  affected_area?: string;
  steps_to_reproduce?: string;
  recommendation?: string;
  vulnerability_references?: string;
}

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

function stripFences(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function extractJSON(raw: string): { summary?: string; findings?: Finding[] } | null {
  if (!raw?.trim()) return null;
  const text = stripFences(raw);

  // 1. Direct parse
  try {
    const p = JSON.parse(text);
    if (p && typeof p === 'object') return p;
  } catch {
    /* next */
  }

  // 2. Extract outermost { ... }
  const os = text.indexOf('{');
  const oe = text.lastIndexOf('}');
  if (os !== -1 && oe > os) {
    try {
      const p = JSON.parse(text.slice(os, oe + 1));
      if (p && typeof p === 'object') return p;
    } catch {
      /* next */
    }
  }

  // 3. Salvage truncated findings array
  const fIdx = text.indexOf('"findings"');
  if (fIdx !== -1) {
    const bs = text.indexOf('[', fIdx);
    if (bs !== -1) {
      let chunk = text.slice(bs);
      const lastComma = chunk.lastIndexOf('},');
      const lastBrace = chunk.lastIndexOf('}');
      const cut = lastComma !== -1 ? lastComma + 1 : lastBrace !== -1 ? lastBrace + 1 : -1;
      if (cut !== -1) {
        chunk = chunk.slice(0, cut) + ']';
        try {
          const arr = JSON.parse(chunk);
          if (Array.isArray(arr)) {
            const sm = text.match(/"summary"\s*:\s*"([^"]+)"/);
            return { summary: sm?.[1], findings: arr };
          }
        } catch {
          /* next */
        }
      }
    }
  }

  // 4. Regex-extract individual finding objects
  const findings: Finding[] = [];
  const pattern = /\{[^{}]*"title"[^{}]*"severity"[^{}]*\}/gs;
  for (const m of text.matchAll(pattern)) {
    try {
      const f = JSON.parse(m[0]);
      if (f.title && f.severity) findings.push(f as Finding);
    } catch {
      /* skip */
    }
  }
  if (findings.length > 0) {
    const sm = text.match(/"summary"\s*:\s*"([^"]+)"/);
    return { summary: sm?.[1], findings };
  }

  return null;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const geminiUrl = getAIIntegrationUrl();

  const rows = await sql`
    SELECT * FROM security_scans WHERE id = ${id} AND created_by = ${session.user.id}
  `;
  if (!rows[0]) return Response.json({ error: 'Scan not found' }, { status: 404 });
  const scan = rows[0];

  await sql`UPDATE security_scans SET status = 'running', updated_at = NOW() WHERE id = ${id}`;

  try {
    const scanTypesArr: string[] = Array.isArray(scan.scan_types)
      ? scan.scan_types
      : (() => {
          try {
            return JSON.parse(String(scan.scan_types || '[]'));
          } catch {
            return [];
          }
        })();

    const prompt = `You are a senior application security expert.

Application to assess:
- Name: ${scan.name}
- URL: ${scan.target_url || 'Not provided'}
- Description: ${(scan.description || 'No description').slice(0, 300)}
- Scan Types: ${scanTypesArr.join(', ')}

Return ONLY raw JSON — no markdown, no code fences, no explanation before or after.

Required format:
{"summary":"2-3 sentence executive summary","findings":[{"title":"vuln title","category":"OWASP category","severity":"critical","description":"what the vulnerability is","affected_area":"endpoint or component","steps_to_reproduce":"numbered steps","recommendation":"how to fix it","vulnerability_references":"CVE/CWE/OWASP refs"}]}

STRICT RULES:
- Output ONLY the JSON object — nothing else before or after
- Generate 5 to 7 findings only (keep response short, avoid truncation)
- severity must be one of exactly: critical, high, medium, low, info
- Keep every string field under 120 characters
- No line breaks inside string values`;

    console.log('[security-scan] calling:', geminiUrl, '| scan types:', scanTypesArr);

    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.ANYTHING_PROJECT_TOKEN,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(45000),
    });

    // ALWAYS read body as text first — never call .json() directly.
    // .json() on an empty or non-JSON body throws "Unexpected end of JSON input".
    const responseText = await aiRes.text().catch(() => '');
    console.log(
      '[security-scan] HTTP status:',
      aiRes.status,
      '| body length:',
      responseText.length
    );
    console.log('[security-scan] body preview:', responseText.slice(0, 300));

    if (!aiRes.ok) {
      console.error('[security-scan] AI request failed:', aiRes.status, responseText.slice(0, 300));
      await sql`UPDATE security_scans SET status = 'failed', updated_at = NOW() WHERE id = ${id}`;
      return Response.json({ error: `AI error (${aiRes.status}) — please retry` }, { status: 502 });
    }

    if (!responseText.trim()) {
      console.error('[security-scan] empty response body');
      await sql`UPDATE security_scans SET status = 'failed', updated_at = NOW() WHERE id = ${id}`;
      return Response.json({ error: 'AI returned empty response — please retry' }, { status: 422 });
    }

    // Parse the API envelope
    let aiData: { choices?: { message?: { content?: string } }[] };
    try {
      aiData = JSON.parse(responseText);
    } catch (err) {
      console.error('[security-scan] envelope parse failed:', String(err));
      console.error('[security-scan] raw envelope:', responseText.slice(0, 500));
      await sql`UPDATE security_scans SET status = 'failed', updated_at = NOW() WHERE id = ${id}`;
      return Response.json(
        { error: 'AI returned malformed response — please retry' },
        { status: 422 }
      );
    }

    const raw: string = aiData?.choices?.[0]?.message?.content || '';
    console.log('[security-scan] content length:', raw.length, '| preview:', raw.slice(0, 300));

    if (!raw.trim()) {
      await sql`UPDATE security_scans SET status = 'failed', updated_at = NOW() WHERE id = ${id}`;
      return Response.json({ error: 'AI returned empty content — please retry' }, { status: 422 });
    }

    // Extract findings with multiple fallback strategies
    const parsed = extractJSON(raw);
    const summary = parsed?.summary || 'Security assessment completed.';
    const findings: Finding[] = (parsed?.findings || []).filter(
      (f): f is Finding => !!f.title && !!f.severity
    );

    if (findings.length === 0) {
      console.error('[security-scan] no findings extracted. content:', raw.slice(0, 600));
      await sql`
        UPDATE security_scans SET
          status = 'failed',
          ai_summary = ${'Could not parse AI response. Please retry.'},
          updated_at = NOW()
        WHERE id = ${id}
      `;
      return Response.json({ error: 'Could not extract findings — please retry' }, { status: 422 });
    }

    // Tally severities
    const severitySummary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
      const sev = VALID_SEVERITIES.includes(f.severity as (typeof VALID_SEVERITIES)[number])
        ? f.severity
        : 'info';
      severitySummary[sev as keyof typeof severitySummary]++;
    }

    // Persist findings
    for (const f of findings) {
      const sev = VALID_SEVERITIES.includes(f.severity as (typeof VALID_SEVERITIES)[number])
        ? f.severity
        : 'info';
      await sql`
        INSERT INTO security_findings
          (scan_id, title, category, severity, description, affected_area,
           steps_to_reproduce, recommendation, vulnerability_references)
        VALUES (
          ${id},
          ${String(f.title || 'Untitled').slice(0, 500)},
          ${String(f.category || 'General').slice(0, 200)},
          ${sev},
          ${String(f.description || '').slice(0, 2000)},
          ${f.affected_area ? String(f.affected_area).slice(0, 500) : null},
          ${f.steps_to_reproduce ? String(f.steps_to_reproduce).slice(0, 2000) : null},
          ${f.recommendation ? String(f.recommendation).slice(0, 2000) : null},
          ${f.vulnerability_references ? String(f.vulnerability_references).slice(0, 500) : null}
        )
      `;
    }

    // Mark completed
    await sql`
      UPDATE security_scans SET
        status = 'completed',
        ai_summary = ${summary},
        total_findings = ${findings.length},
        severity_summary = ${JSON.stringify(severitySummary)},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    console.log('[security-scan] completed —', findings.length, 'findings saved');
    return Response.json({
      success: true,
      total_findings: findings.length,
      severity_summary: severitySummary,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[security-scan] fatal error:', msg);
    await sql`UPDATE security_scans SET status = 'failed', updated_at = NOW() WHERE id = ${id}`;
    return Response.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
