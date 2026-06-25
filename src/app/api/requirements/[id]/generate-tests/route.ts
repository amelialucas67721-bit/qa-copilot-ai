import sql from '@/app/api/utils/sql';
import { getAIIntegrationUrl } from '@/app/api/utils/ai';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

function safeParseJSON(raw: string) {
  let text = raw.trim();
  // Strip markdown code fences if present
  if (text.startsWith('`')) {
    const firstNewline = text.indexOf('\n');
    if (firstNewline !== -1) text = text.slice(firstNewline + 1);
    const lastFence = text.lastIndexOf('`');
    if (lastFence !== -1) text = text.slice(0, lastFence).trimEnd();
    // Remove trailing ```
    if (text.endsWith('`')) text = text.replace(/`+$/, '').trimEnd();
  }
  return JSON.parse(text.trim());
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const requirement = await sql`
      SELECT r.*, p.created_by, p.id as proj_id
      FROM requirements r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = ${id} AND p.created_by = ${session.user.id}
    `;

    if (requirement.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const req = requirement[0];

    if (!req.ai_analysis) {
      return Response.json({ error: 'Requirement must be analyzed first' }, { status: 400 });
    }

    // Get all modules with their pages
    const modules = await sql`
      SELECT m.id, m.name, m.description,
        json_agg(
          json_build_object('id', p.id, 'name', p.name, 'description', p.description)
        ) FILTER (WHERE p.id IS NOT NULL) as pages
      FROM modules m
      LEFT JOIN pages p ON p.module_id = m.id
      WHERE m.requirement_id = ${id}
      GROUP BY m.id
    `;

    const testCases: unknown[] = [];

    // Start counter after the highest existing TC number to avoid unique constraint conflicts
    const maxIdRow = await sql`
      SELECT test_case_id FROM test_cases ORDER BY created_at DESC LIMIT 1
    `;
    let counter = 1;
    if (maxIdRow.length > 0) {
      const match = maxIdRow[0].test_case_id.match(/TC-(\d+)/);
      if (match) counter = parseInt(match[1], 10) + 1;
    }

    const integrationUrl = getAIIntegrationUrl();

    console.log('[generate-tests] integration URL:', integrationUrl);

    for (const module of modules) {
      const pages = module.pages || [];

      for (const page of pages) {
        if (!page.id) continue;

        const features = await sql`SELECT * FROM features WHERE page_id = ${page.id}`;

        for (const feature of features) {
          const prompt = [
            'You are a QA expert. Generate comprehensive test cases for this feature.',
            '',
            `Module: ${module.name}`,
            `Page: ${page.name}`,
            `Feature: ${feature.name}`,
            `Description: ${feature.description || 'No description provided'}`,
            '',
            'Generate 8-12 test cases covering these types: functional, ui, negative, validation, boundary.',
            '',
            'Return ONLY a valid JSON object with NO markdown, NO code fences — raw JSON only:',
            '{"test_cases":[{"test_scenario":"Clear description","preconditions":"Setup needed","test_steps":["Step 1","Step 2"],"test_data":"Example data or null","expected_result":"What should happen","priority":"high","severity":"major","test_type":"functional","automation_candidate":true}]}',
          ].join('\n');

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
            const errText = await aiResponse.text();
            console.error(
              '[generate-tests] AI failed for feature:',
              feature.name,
              aiResponse.status,
              errText.slice(0, 300)
            );
            continue;
          }

          const aiData = await aiResponse.json();
          const rawContent: string = aiData.choices[0].message.content;

          let parsed;
          try {
            parsed = safeParseJSON(rawContent);
          } catch {
            console.error(
              '[generate-tests] Parse failed for feature:',
              feature.name,
              rawContent.slice(0, 200)
            );
            continue;
          }

          const generatedTests: {
            test_scenario: string;
            preconditions?: string;
            test_steps: string[];
            test_data?: string;
            expected_result: string;
            priority?: string;
            severity?: string;
            test_type?: string;
            automation_candidate?: boolean;
          }[] = parsed.test_cases || [];

          for (const tc of generatedTests) {
            const testCaseId = `TC-${String(counter++).padStart(4, '0')}`;

            // Sanitize enum values to avoid constraint violations
            const validPriorities = ['critical', 'high', 'medium', 'low'];
            const validSeverities = ['critical', 'major', 'moderate', 'minor'];
            const validTypes = [
              'functional',
              'ui',
              'negative',
              'validation',
              'boundary',
              'api',
              'regression',
            ];

            const priority = validPriorities.includes(tc.priority || '') ? tc.priority : 'medium';
            const severity = validSeverities.includes(tc.severity || '') ? tc.severity : 'moderate';
            const testType = validTypes.includes(tc.test_type || '') ? tc.test_type : 'functional';

            const title =
              `[${(testType || 'functional').toUpperCase()}] ${feature.name} - ${tc.test_scenario}`.substring(
                0,
                200
              );

            try {
              const result = await sql`
                INSERT INTO test_cases (
                  test_case_id, project_id, requirement_id, module_id, page_id, feature_id,
                  title, test_scenario, preconditions, test_steps, test_data, expected_result,
                  priority, severity, test_type, automation_candidate, status, created_by
                ) VALUES (
                  ${testCaseId}, ${req.proj_id}, ${id}, ${module.id}, ${page.id}, ${feature.id},
                  ${title}, ${tc.test_scenario}, ${tc.preconditions || null},
                  ${JSON.stringify(tc.test_steps || [])}, ${tc.test_data || null},
                  ${tc.expected_result}, ${priority}, ${severity},
                  ${testType}, ${tc.automation_candidate ?? false},
                  'ready', ${session.user.id}
                )
                RETURNING *
              `;
              testCases.push(result[0]);
            } catch (insertErr) {
              console.error('[generate-tests] Insert failed for TC:', testCaseId, insertErr);
            }
          }
        }
      }
    }

    // Mark requirement as completed
    await sql`
      UPDATE requirements SET status = 'completed', updated_at = NOW() WHERE id = ${id}
    `;

    return Response.json({
      success: true,
      test_cases_generated: testCases.length,
      test_cases: testCases,
    });
  } catch (error) {
    console.error('[generate-tests] Unexpected error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate test cases' },
      { status: 500 }
    );
  }
}
