import { UserRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import { EmployeeTable } from './components/EmployeeTable';
import { EmployeeViewModal } from './components/EmployeeViewModal';
import { EmployeesContent } from './components/EmployeesContent';
import { useEmployees } from './hooks/useEmployees';

export function EmployeesPage(props) {
  const employees = useEmployees(props);

  return (
    <EmployeesContent title="พนักงาน" icon={UserRound} stats={employees.stats}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="primary" size="sm" onClick={employees.openCreate}>+ เพิ่มพนักงาน</Button>
      </div>

      <EmployeeTable
        employees={employees.employees}
        branches={props.data.branches}
        employeeBranches={props.data.employeeBranches}
        onView={employees.openView}
        onEdit={employees.openEdit}
      />

      {employees.showModal && employees.modalMode !== 'view' ? (
        <EmployeeFormModal
          mode={employees.modalMode}
          employee={employees.activeEmployee}
          branches={employees.branches}
          onSubmit={employees.handleFormSubmit}
          onClose={employees.closeModal}
        />
      ) : null}

      {employees.showModal && employees.modalMode === 'view' && employees.activeEmployee ? (
        <EmployeeViewModal
          employee={employees.activeEmployee}
          branches={props.data.branches}
          onClose={employees.closeModal}
        />
      ) : null}
    </EmployeesContent>
  );
}
