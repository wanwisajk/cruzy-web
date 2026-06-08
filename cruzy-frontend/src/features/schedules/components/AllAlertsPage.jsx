import { useState } from "react";

export default function AllAlertsPage({ alerts, onAssign, onClose }) {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all" ? alerts : alerts.filter((a) => a.type === filter);
  const dangerCount = alerts.filter((a) => a.type === "danger").length;
  const warnCount = alerts.filter((a) => a.type === "warn").length;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Nav */}
      {/* <div className="sticky top-0 z-10 bg-green-900 text-white h-12 flex items-center justify-between px-4 shadow flex-shrink-0"> */}
        {/* <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1 caption-strong bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 4L6 8l4 4" />
            </svg>
            กลับ
          </button>
          <span className="body-strong">การแจ้งเตือนทั้งหมด</span>
        </div> */}
        {/* <div className="flex items-center gap-2">
          <span className="caption bg-white/15 px-2 py-1 rounded-full">
            {alerts.length} รายการ
          </span>
        </div> */}
      {/* </div> */}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "การแจ้งเตือน",
              count: alerts.length,
              color: "border-l-blue-500 text-blue-500",
            },
            {
              label: "สาขาว่าง",
              count: dangerCount,
              color: "border-l-red-500 text-red-600",
            },
            {
              label: "คนไม่พอ",
              count: warnCount,
              color: "border-l-amber-500 text-amber-600",
            },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-3 text-center`}
            >
              <div className={`heading-2 ${color.split(" ")[1]}`}>
                {count}
              </div>
              <div className="caption text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            {
              key: "all",
              label: "การแจ้งเตือน",
              active: "bg-green-800 text-white border-green-800",
            },
            {
              key: "danger",
              label: "สาขาว่าง",
              active: "bg-red-500 text-white border-red-500",
            },
            {
              key: "warn",
              label: "คนไม่พอ",
              active: "bg-amber-500 text-white border-amber-500",
            },
          ].map(({ key, label, active }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`caption body-strong px-3 py-1 rounded-full border transition-colors ${
                filter === key
                  ? active
                  : "bg-white text-gray-500 border-gray-200 hover:border-green-800 hover:text-green-800"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto caption text-gray-400">
            แสดง {filtered.length} จาก {alerts.length} รายการ
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="body-strong text-gray-700">รายการแจ้งเตือน</h3>
            <span className="caption body-strong bg-blue-500 text-white px-2 py-0.5 rounded-full">
              {filtered.length} รายการ
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full caption">
              <thead>
                <tr className="bg-gray-50 text-gray-400 caption body-strong">
                  <th className="text-left px-4 py-2.5 border-b border-gray-100">
                    #
                  </th>
                  <th className="text-left px-4 py-2.5 border-b border-gray-100">
                    ประเภท
                  </th>
                  <th className="text-left px-4 py-2.5 border-b border-gray-100">
                    สาขา
                  </th>
                  <th className="text-left px-4 py-2.5 border-b border-gray-100">
                    วันที่
                  </th>
                  <th className="text-left px-4 py-2.5 border-b border-gray-100">
                    รายละเอียด
                  </th>
                  <th className="text-left px-4 py-2.5 border-b border-gray-100"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-gray-400 py-8 italic"
                    >
                      ไม่มีรายการ
                    </td>
                  </tr>
                ) : (
                  filtered.map((alert, i) => (
                    <tr
                      key={`${alert.type}_${alert.branch.id}_${alert.date}`}
                      className="hover:bg-gray-50 border-b border-gray-50"
                    >
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full caption body-strong ${
                            alert.type === "danger"
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          ● {alert.type === "danger" ? "สาขาว่าง" : "คนไม่พอ"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 body-strong text-green-800">
                        {alert.branch.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {alert.date}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {alert.message}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() =>
                            onAssign({
                              branchId: alert.branch.id,
                              date: alert.date,
                            })
                          }
                          className={`caption-strong px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${
                            alert.type === "danger"
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-amber-500 hover:bg-amber-600 text-white"
                          }`}
                        >
                          จัดคน
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}