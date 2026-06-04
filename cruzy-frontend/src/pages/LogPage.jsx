import { useState, useMemo, useCallback } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs.js';
import { thaiShortDate } from '../lib/date.js';

const ACTION_CONFIG = {
  CREATE: { label: 'CREATE', bg: '#E8F5E9', text: '#1B5E20' },
  UPDATE: { label: 'UPDATE', bg: '#E3F2FD', text: '#1565C0' },
  APPROVE: { label: 'APPROVE', bg: '#F3E5F5', text: '#7B1FA2' },
  REJECT: { label: 'REJECT', bg: '#FFEBEE', text: '#C62828' },
  DELETE: { label: 'DELETE', bg: '#FFEBEE', text: '#C62828' }
};

const SOURCE_CONFIG = {
  dashboard: { label: 'DASHBOARD', bg: '#E3F2FD', text: '#1565C0' },
  liff: { label: 'LIFF', bg: '#E8F5E9', text: '#1B5E20' },
  api: { label: 'API', bg: '#F3E5F5', text: '#7B1FA2' }
};

export default function LogPage() {
  const { auditLogs, loading, error, refreshAuditLogs } = useAuditLogs();
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAction, setActiveAction] = useState('all');
  const [activeTable, setActiveTable] = useState('all');

  const handleSearch = useCallback(() => {
    refreshAuditLogs({ from_date: fromDate, to_date: toDate, search: searchTerm, action: activeAction !== 'all' ? activeAction : undefined, table_name: activeTable !== 'all' ? activeTable : undefined });
  }, [fromDate, toDate, searchTerm, activeAction, activeTable, refreshAuditLogs]);

  const filteredLogs = useMemo(() => {
    let logs = auditLogs;
    if (activeAction !== 'all') {
      logs = logs.filter(log => log.action === activeAction);
    }
    if (activeTable !== 'all') {
      logs = logs.filter(log => log.table_name === activeTable);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      logs = logs.filter(log => 
        (log.user_name || '').toLowerCase().includes(search) ||
        (log.description || '').toLowerCase().includes(search)
      );
    }
    return logs;
  }, [auditLogs, activeAction, activeTable, searchTerm]);

  const uniqueActions = useMemo(() => {
    return [...new Set(auditLogs.map(log => log.action))].filter(Boolean);
  }, [auditLogs]);

  const uniqueTables = useMemo(() => {
    return [...new Set(auditLogs.map(log => log.table_name))].filter(Boolean);
  }, [auditLogs]);

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: '#F5F5F5', fontFamily: "'Noto Sans Thai', -apple-system, sans-serif" }}>
      {/* Navigation */}
      <nav style={{ background: '#1B5E20', color: '#fff', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 600 }}>📋 Cruzy Admin</h1>
          <div style={{ fontSize: '10px', background: 'rgba(255,255,255,.15)', padding: '3px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#69F0AE', display: 'inline-block' }}></span>
            ประวัติระบบ
          </div>
        </div>
        <div style={{ fontSize: '10px', background: 'rgba(255,255,255,.2)', padding: '3px 8px', borderRadius: '12px' }}>
          👑 Admin
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Date Bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E0E0E0', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1B5E20' }}>📅 ช่วงเวลาประวัติ:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#1B5E20'} onBlur={(e) => e.target.style.borderColor = '#E0E0E0'} />
          <span>ถึง</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#1B5E20'} onBlur={(e) => e.target.style.borderColor = '#E0E0E0'} />
          <button onClick={handleSearch} style={{ background: '#1B5E20', color: '#fff', padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ค้นหา
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', flex: 1 }}>
          {/* Filter Section */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: '14px' }}>
            <input 
              type="text" 
              placeholder="🔎 ค้นหาผู้ใช้, รายละเอียด..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', maxWidth: '300px', padding: '8px 12px', border: '1.5px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', marginBottom: '12px', display: 'block' }}
              onFocus={(e) => e.target.style.borderColor = '#1B5E20'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />

            {/* Action Filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#888', width: '100px', display: 'inline-block' }}>คำสั่ง (Action):</span>
              <button 
                onClick={() => setActiveAction('all')} 
                style={{ padding: '4px 10px', border: activeAction === 'all' ? 'none' : '1.5px solid #E0E0E0', borderRadius: '6px', background: activeAction === 'all' ? '#1B5E20' : '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: activeAction === 'all' ? '#fff' : '#888', transition: '.15s' }}
              >
                ทั้งหมด
              </button>
              {uniqueActions.map(action => (
                <button
                  key={action}
                  onClick={() => setActiveAction(action)}
                  style={{ padding: '4px 10px', border: activeAction === action ? 'none' : '1.5px solid #E0E0E0', borderRadius: '6px', background: activeAction === action ? '#1B5E20' : '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: activeAction === action ? '#fff' : '#888', transition: '.15s' }}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Table Filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#888', width: '100px', display: 'inline-block' }}>ข้อมูล (Table):</span>
              <button 
                onClick={() => setActiveTable('all')} 
                style={{ padding: '4px 10px', border: activeTable === 'all' ? 'none' : '1.5px solid #E0E0E0', borderRadius: '6px', background: activeTable === 'all' ? '#1B5E20' : '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: activeTable === 'all' ? '#fff' : '#888', transition: '.15s' }}
              >
                ทั้งหมด
              </button>
              {uniqueTables.map(table => (
                <button
                  key={table}
                  onClick={() => setActiveTable(table)}
                  style={{ padding: '4px 10px', border: activeTable === table ? 'none' : '1.5px solid #E0E0E0', borderRadius: '6px', background: activeTable === table ? '#1B5E20' : '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: activeTable === table ? '#fff' : '#888', transition: '.15s' }}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          {/* Logs Container */}
          {loading ? (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#888' }}>
              กำลังโหลดข้อมูล...
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #E0E0E0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>บันทึกประวัติการทำงานของระบบ (Audit Logs)</h3>
              </div>

              {filteredLogs.length > 0 ? (
                <div>
                  {filteredLogs.map((log, idx) => (
                    <div key={log.id || idx} style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderBottom: idx < filteredLogs.length - 1 ? '1px solid #F5F5F5' : 'none', fontSize: '12px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '10px', color: '#888', whiteSpace: 'nowrap', minWidth: '120px', paddingTop: '2px' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-'}
                      </div>
                      <div style={{ fontWeight: 600, color: '#333', minWidth: '100px' }}>
                        {log.user_name || 'system'}
                      </div>
                      <div>
                        <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, textAlign: 'center', minWidth: '60px', background: ACTION_CONFIG[log.action]?.bg || '#F5F5F5', color: ACTION_CONFIG[log.action]?.text || '#888' }}>
                          {log.action || 'ACTION'}
                        </span>
                      </div>
                      <div>
                        <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 600, background: '#F5F5F5', color: '#888' }}>
                          {log.table_name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span style={{ display: 'inline-block', padding: '1px 5px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, background: SOURCE_CONFIG[log.source]?.bg || '#F5F5F5', color: SOURCE_CONFIG[log.source]?.text || '#888' }}>
                          {SOURCE_CONFIG[log.source]?.label || log.source || 'N/A'}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#333' }}>
                          {log.description || 'No description'}
                        </div>
                        {log.old_value && Object.keys(log.old_value).length > 0 && (
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', background: '#F9F9F9', padding: '6px 10px', borderRadius: '6px', borderLeft: '2px solid #E0E0E0' }}>
                            {Object.entries(log.old_value).map(([key, val]) => (
                              <div key={key}>
                                <span style={{ textDecoration: 'line-through', color: '#F44336', marginRight: '4px' }}>
                                  {key}: {String(val)}
                                </span>
                                {log.new_value && log.new_value[key] !== undefined && (
                                  <span> ➡️ <span style={{ color: '#1B5E20', fontWeight: 600 }}>{key}: {String(log.new_value[key])}</span></span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                  ไม่พบประวัติการทำงาน
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
