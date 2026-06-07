import { X } from "lucide-react";
import AddEmployeeForm from "./AddEmployeeForm";

const titles = {
  create: "ลงทะเบียนและสร้างโปรไฟล์รายได้พนักงานใหม่",
  edit: "แก้ไขข้อมูลพนักงาน",
};

export function EmployeeFormModal({
  mode,
  employee,
  branches,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="overlay open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal max-w-2xl">
        <div className="m-head">
          <h2>{titles[mode]}</h2>

          <button type="button" className="m-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="m-body">
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