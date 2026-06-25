import sql from '@/app/api/utils/sql';

type FailedExecution = {
  execution_id: string;
  project_id: string;
  test_case_code: string;
  title: string;
  test_scenario: string | null;
  test_steps: unknown;
  expected_result: string | null;
  error_message: string | null;
  severity: string | null;
  priority: string | null;
};

function normalizeSeverity(value: string | null): string {
  return ['critical', 'major', 'moderate', 'minor'].includes(value || '') ? value! : 'moderate';
}

function normalizePriority(value: string | null): string {
  return ['critical', 'high', 'medium', 'low'].includes(value || '') ? value! : 'medium';
}

function formatSteps(raw: unknown): string | null {
  if (!raw) return null;

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed
        .map((step, index) => {
          const text =
            typeof step === 'string'
              ? step
              : step.step || step.action || step.description || JSON.stringify(step);
          return `${index + 1}. ${text}`;
        })
        .join('\n');
    }
  } catch {
    // Fall back to the raw value below.
  }

  return String(raw);
}

export async function syncFailedTestExecutionsToDefects(testRunId: string, createdBy: string) {
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_defects_test_execution_id
    ON defects(test_execution_id)
    WHERE test_execution_id IS NOT NULL
  `;

  const failedExecutions = (await sql`
    SELECT
      te.id AS execution_id,
      tr.project_id,
      tc.test_case_id AS test_case_code,
      tc.title,
      tc.test_scenario,
      tc.test_steps,
      tc.expected_result,
      te.error_message,
      tc.severity,
      tc.priority
    FROM test_executions te
    JOIN test_runs tr ON tr.id = te.test_run_id
    JOIN test_cases tc ON tc.id = te.test_case_id
    LEFT JOIN defects d ON d.test_execution_id = te.id
    WHERE te.test_run_id = ${testRunId}
      AND te.status = 'failed'
      AND d.id IS NULL
  `) as FailedExecution[];

  if (failedExecutions.length === 0) return;

  const countRows = await sql`SELECT COUNT(*) AS count FROM defects`;
  let nextDefectNumber = Number(countRows[0]?.count || 0) + 1;

  for (const execution of failedExecutions) {
    const defectId = `DEF-${String(nextDefectNumber++).padStart(4, '0')}`;
    const failureReason = execution.error_message || 'Test case failed during test run execution.';

    await sql`
      INSERT INTO defects (
        defect_id,
        project_id,
        test_execution_id,
        title,
        description,
        steps_to_reproduce,
        expected_result,
        actual_result,
        severity,
        priority,
        root_cause_suggestion,
        status,
        created_by
      )
      VALUES (
        ${defectId},
        ${execution.project_id},
        ${execution.execution_id},
        ${`Failed test case: ${execution.test_case_code} - ${execution.title}`.slice(0, 250)},
        ${execution.test_scenario || execution.title || 'A test case failed during execution.'},
        ${formatSteps(execution.test_steps)},
        ${execution.expected_result || null},
        ${failureReason},
        ${normalizeSeverity(execution.severity)},
        ${normalizePriority(execution.priority)},
        ${failureReason},
        'open',
        ${createdBy}
      )
      ON CONFLICT (test_execution_id) WHERE test_execution_id IS NOT NULL DO NOTHING
    `;
  }
}
