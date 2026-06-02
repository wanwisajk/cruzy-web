import AddEmployeeForm from '../../../components/AddEmployeeForm';

const titles = {
  create: '➕ ลงทะเบียนและสร้างโปรไฟล์รายได้พนักงานใหม่',
  edit: '✏️ แก้ไขข้อมูลพนักงาน'
};

export function EmployeeFormModal({ mode, employee, branches, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">{titles[mode]}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <AddEmployeeForm
            branches={branches}
            onSubmit={onSubmit}
            onCancel={onClose}
            employee={employee}
            mode={mode}
          />
        </div>
      </div>
    </div>
  );
}
