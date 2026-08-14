import assert from 'node:assert/strict';
import test from 'node:test';
import { filterEmployeeDirectory } from './employeeDirectory';

const employees = [
  { id: 'active', status: 'ACTIVE' as const },
  { id: 'leave', status: 'LEAVE' as const },
  { id: 'retired', status: 'RESIGNED' as const },
];

test('hides retired employees from the default directory after deletion', () => {
  const visible = filterEmployeeDirectory(employees, 'all');

  assert.deepEqual(visible.map((employee) => employee.id), ['active', 'leave']);
});

test('shows retired employees only when the retired filter is selected', () => {
  const visible = filterEmployeeDirectory(employees, 'RESIGNED');

  assert.deepEqual(visible.map((employee) => employee.id), ['retired']);
});
