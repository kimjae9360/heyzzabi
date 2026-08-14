export type EmployeeDirectoryStatus = 'ACTIVE' | 'LEAVE' | 'RESIGNED' | 'LOCKED';
export type EmployeeDirectoryFilter = 'all' | EmployeeDirectoryStatus;

type DirectoryEmployee = { status: EmployeeDirectoryStatus };

// 삭제된 직원은 업무 이력을 보존하기 위해 RESIGNED 상태로 유지하고, 기본 목록에서는 숨긴다.
export function filterEmployeeDirectory<T extends DirectoryEmployee>(
  employees: T[],
  filter: EmployeeDirectoryFilter,
) {
  return filter === 'all'
    ? employees.filter((employee) => employee.status !== 'RESIGNED')
    : employees.filter((employee) => employee.status === filter);
}
