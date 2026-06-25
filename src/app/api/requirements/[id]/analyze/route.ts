import sql from '@/app/api/utils/sql';
import { getAIIntegrationUrl } from '@/app/api/utils/ai';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

function safeParseJSON(raw: string) {
  let text = raw.trim();
  // Strip markdown code fences
  const fenceMatch = text.match(/^```(?:json)?\n?([\s\S]*?)```$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  return JSON.parse(text);
}

async function readAIError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text.trim()) return `AI service returned ${response.status}`;

  try {
    const data = JSON.parse(text) as { error?: unknown; message?: unknown };
    const message = data.error || data.message;
    if (message) return String(message);
  } catch {
    // Do not expose HTML error pages to the client.
  }

  return `AI service returned ${response.status}`;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const requirement = await sql`
      SELECT r.*, p.created_by
      FROM requirements r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = ${id} AND p.created_by = ${session.user.id}
    `;

    if (requirement.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const req = requirement[0];

    const integrationUrl = getAIIntegrationUrl();

    const prompt = `You are a QA expert analyzing software requirements. Analyze the following ${req.requirement_type} requirement and extract modules, pages, features, and user flows.

Requirement Title: ${req.title}

Requirement Content:
${req.content.slice(0, 8000)}

Return ONLY a valid JSON object with NO markdown, NO code fences. Use exactly this structure:
{
  "summary": "2-3 sentence summary",
  "modules": [
    {
      "name": "Module Name",
      "description": "description",
      "pages": [
        {
          "name": "Page Name",
          "description": "description",
          "features": [
            { "name": "Feature Name", "description": "description", "priority": "high" }
          ]
        }
      ]
    }
  ],
  "user_flows": [
    { "name": "Flow Name", "description": "description", "steps": ["Step 1"] }
  ]
}`;

    const aiResponse = await fetch(integrationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ANYTHING_PROJECT_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errMessage = await readAIError(aiResponse);
      console.error('[analyze] AI error status:', aiResponse.status, errMessage);
      return Response.json(
        { error: errMessage },
        { status: 502 }
      );
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch {
      return Response.json({ error: 'AI returned a non-JSON response' }, { status: 502 });
    }
    const rawContent: string = aiData.choices[0].message.content;

    let analysis;
    try {
      analysis = safeParseJSON(rawContent);
    } catch {
      console.error('[analyze] JSON parse failed. Raw:', rawContent.slice(0, 500));
      return Response.json(
        { error: 'AI returned an unexpected format — please try again.' },
        { status: 502 }
      );
    }

    await sql`
      UPDATE requirements
      SET ai_analysis = ${JSON.stringify(analysis)},
          modules     = ${JSON.stringify(analysis.modules || [])},
          pages       = ${JSON.stringify(
            (analysis.modules || []).flatMap((m: { pages: unknown[] }) => m.pages || [])
          )},
          features    = ${JSON.stringify(
            (analysis.modules || []).flatMap((m: { pages: { features: unknown[] }[] }) =>
              (m.pages || []).flatMap((p) => p.features || [])
            )
          )},
          user_flows  = ${JSON.stringify(analysis.user_flows || [])},
          status      = 'analyzed',
          updated_at  = NOW()
      WHERE id = ${id}
    `;

    for (const module of analysis.modules || []) {
      const modRow = await sql`
        INSERT INTO modules (requirement_id, name, description)
        VALUES (${id}, ${module.name}, ${module.description || ''})
        RETURNING *
      `;
      const moduleId = modRow[0].id;

      for (const page of module.pages || []) {
        const pageRow = await sql`
          INSERT INTO pages (module_id, name, description)
          VALUES (${moduleId}, ${page.name}, ${page.description || ''})
          RETURNING *
        `;
        const pageId = pageRow[0].id;

        for (const feature of page.features || []) {
          await sql`
            INSERT INTO features (page_id, name, description)
            VALUES (${pageId}, ${feature.name}, ${feature.description || ''})
          `;
        }
      }
    }

    const updatedReq = await sql`SELECT * FROM requirements WHERE id = ${id}`;
    return Response.json({ requirement: updatedReq[0], analysis });
  } catch (error) {
    console.error('[analyze] Unexpected error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze requirement' },
      { status: 500 }
    );
  }
}
