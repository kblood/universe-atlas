import {writeFileSync} from 'node:fs';
import {relative, isAbsolute} from 'node:path';
export default async function* reporter(source) {
  const failures = [], todos = [];
  let tests = 0;
  let summary;
  for await (const event of source) {
    const d = event.data;
    if (event.type === 'test:summary') summary = d;
    if (event.type === 'test:pass' || event.type === 'test:fail') {
      tests++;
      const row = {title: d.name, file: (isAbsolute(d.file || '') ? relative(process.cwd(), d.file) : d.file || '').replaceAll('\\', '/')};
      if (d.todo) todos.push(row);
      else if (event.type === 'test:fail' && d.details?.error?.failureType !== 'subtestsFailed') failures.push(row);
    }
  }
  if (!process.env.ATLAS_TEST_REPORT) throw new Error('ATLAS_TEST_REPORT is required');
  writeFileSync(process.env.ATLAS_TEST_REPORT, JSON.stringify({tests, failures, todos, summary}, null, 2));
}
