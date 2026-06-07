export function EmployeePageTabs({ activeTab, tabs, onChange }) {
  return (
    <div className="border-b border-gray-100 bg-white px-6 shadow-xs">
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
