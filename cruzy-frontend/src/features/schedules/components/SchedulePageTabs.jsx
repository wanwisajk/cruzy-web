export function SchedulePageTabs({ activeView, tabs, onChange }) {
  return (
    <div className="bg-white px-6 shadow-sm">
      <div className="page-tabs scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`page-tab ${activeView === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
