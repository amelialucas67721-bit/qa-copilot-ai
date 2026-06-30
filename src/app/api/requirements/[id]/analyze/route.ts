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

type RequirementAnalysis = {
  summary: string;
  modules: {
    name: string;
    description: string;
    pages: {
      name: string;
      description: string;
      features: { name: string; description: string; priority: string }[];
    }[];
  }[];
  user_flows: { name: string; description: string; steps: string[] }[];
  fallback?: boolean;
};

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractUrlPath(content: string) {
  const match = content.match(/https?:\/\/[^\s]+/i);
  if (!match) return '';

  try {
    return new URL(match[0]).pathname.replace(/^\/+/, '');
  } catch {
    return '';
  }
}

function fallbackAnalyzeRequirement(req: {
  title: string;
  content: string;
  requirement_type?: string | null;
}): RequirementAnalysis {
  const lines = req.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const steps = lines.length > 0 ? lines : [req.title];
  const urlPath = extractUrlPath(req.content);
  const pageName = titleCase(urlPath.split('/').filter(Boolean).pop() || req.title || 'Requirement');
  const featureName = titleCase(req.title || 'Requirement Flow');

  return {
    fallback: true,
    summary:
      `Fallback analysis generated because the AI quota is currently unavailable. ` +
      `The requirement describes ${featureName} and the expected user flow around ${pageName}.`,
    modules: [
      {
        name: `${pageName} Module`,
        description: `Covers ${req.requirement_type || 'functional'} behavior for ${pageName}.`,
        pages: [
          {
            name: pageName,
            description: `Page or area involved in the ${featureName} requirement.`,
            features: [
              {
                name: featureName,
                description: steps.join(' '),
                priority: 'high',
              },
            ],
          },
        ],
      },
    ],
    user_flows: [
      {
        name: `${featureName} Flow`,
        description: `User completes the ${featureName} flow successfully.`,
        steps,
      },
    ],
  };
}

function isQuotaError(status: number, message: string) {
  return status === 429 || /quota|rate limit|rate-limit|too many requests/i.test(message);
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

    let analysis: RequirementAnalysis;

    if (!aiResponse.ok) {
      const errMessage = await readAIError(aiResponse);
      console.error('[analyze] AI error status:', aiResponse.status, errMessage);

      if (!isQuotaError(aiResponse.status, errMessage)) {
        return Response.json({ error: errMessage }, { status: 502 });
      }

      analysis = fallbackAnalyzeRequirement(req);
    } else {
      let aiData;
      try {
        aiData = await aiResponse.json();
      } catch {
        return Response.json({ error: 'AI returned a non-JSON response' }, { status: 502 });
      }
      const rawContent: string = aiData.choices[0].message.content;

      try {
        analysis = safeParseJSON(rawContent);
      } catch {
        console.error('[analyze] JSON parse failed. Raw:', rawContent.slice(0, 500));
        return Response.json(
          { error: 'AI returned an unexpected format — please try again.' },
          { status: 502 }
        );
      }
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

    await sql`DELETE FROM modules WHERE requirement_id = ${id}`;

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
