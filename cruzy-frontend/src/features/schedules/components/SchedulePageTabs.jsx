export function SchedulePageTabs({ activeView, tabs, onChange }) {
  return (
    <div className="border-b border-gray-100 bg-white px-6 shadow-sm">
      <div className="flex overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
              activeView === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
