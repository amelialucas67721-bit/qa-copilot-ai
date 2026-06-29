import { dbPool } from '@/lib/db';
import type { PoolClient, QueryResultRow } from 'pg';

type SqlRows = QueryResultRow[];
type SqlValue = unknown;
type SqlFragment = {
  __sqlFragment: true;
  text: string;
  values: SqlValue[];
};
type SqlStatement = Promise<SqlRows> &
  SqlFragment & {
    execute: (client?: PoolClient) => Promise<SqlRows>;
  };
type SqlQueryFunction = {
  (strings: TemplateStringsArray, ...values: SqlValue[]): SqlStatement;
  (query: string, values?: SqlValue[]): Promise<SqlRows>;
  query: SqlQueryFunction;
  transaction: (queries: Array<SqlStatement | Promise<SqlRows>>) => Promise<SqlRows[]>;
};

function assertDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set'
    );
  }
}

function isSqlFragment(value: SqlValue): value is SqlFragment {
  return Boolean(value && typeof value === 'object' && (value as SqlFragment).__sqlFragment);
}

function offsetParameters(text: string, offset: number) {
  return text.replace(/\$(\d+)/g, (_, index: string) => `$${Number(index) + offset}`);
}

function buildStatement(strings: TemplateStringsArray, values: SqlValue[]) {
  let text = strings[0] ?? '';
  const params: SqlValue[] = [];

  values.forEach((value, index) => {
    if (isSqlFragment(value)) {
      text += offsetParameters(value.text, params.length);
      params.push(...value.values);
    } else {
      params.push(value);
      text += `$${params.length}`;
    }
    text += strings[index + 1] ?? '';
  });

  return { text, values: params };
}

async function runQuery(text: string, values: SqlValue[] = [], client?: PoolClient) {
  assertDatabaseUrl();
  const result = client ? await client.query(text, values) : await dbPool.query(text, values);
  return result.rows;
}

function createStatement(text: string, values: SqlValue[]): SqlStatement {
  const execute = (client?: PoolClient) => runQuery(text, values, client);
  const statement = {
    __sqlFragment: true,
    text,
    values,
    execute,
    then: (...args: Parameters<Promise<SqlRows>['then']>) => execute().then(...args),
    catch: (...args: Parameters<Promise<SqlRows>['catch']>) => execute().catch(...args),
    finally: (...args: Parameters<Promise<SqlRows>['finally']>) => execute().finally(...args),
    [Symbol.toStringTag]: 'Promise',
  };

  return statement as SqlStatement;
}

const sql = ((queryOrStrings: string | TemplateStringsArray, ...values: SqlValue[]) => {
  if (typeof queryOrStrings === 'string') {
    return runQuery(queryOrStrings, (values[0] as SqlValue[] | undefined) ?? []);
  }

  const statement = buildStatement(queryOrStrings, values);
  return createStatement(statement.text, statement.values);
}) as SqlQueryFunction;

sql.query = sql;

sql.transaction = async (queries) => {
  assertDatabaseUrl();
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');
    const results: SqlRows[] = [];

    for (const query of queries) {
      if (isSqlFragment(query) && 'execute' in query) {
        results.push(await query.execute(client));
      } else {
        results.push(await query);
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default sql;
