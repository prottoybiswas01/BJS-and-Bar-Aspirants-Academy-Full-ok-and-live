import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('registrations');
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'registrations') {
        const res = await api.get('/admin/registrations');
        if (res.data.ok) setRegistrations(res.data.registrations);
      } else if (activeTab === 'students') {
        const res = await api.get('/admin/students');
        if (res.data.ok) setStudents(res.data.students);
      } else if (activeTab === 'payments') {
        const res = await api.get('/admin/payments');
        if (res.data.ok) setPayments(res.data.payments);
      }
    } catch (err) {
      console.log('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReg = async (regId) => {
    try {
      const res = await api.post('/admin/registrations/approve', {
        regId,
        assignCourses: ['bjs-judiciary-intensive', 'bar-council-advocacy'],
      });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Approve error' });
    }
  };

  const handleStudentAction = async (studentId, action, status) => {
    try {
      const res = await api.post('/admin/students/action', { studentId, action, status });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Action error' });
    }
  };

  const handleVerifyPayment = async (paymentId, action) => {
    try {
      const res = await api.post('/admin/payments/verify', { paymentId, action });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Payment verification error' });
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Top Admin Header */}
      <div className="glass-card rounded-2xl p-6 border border-purple-500/20 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></span>
            <span className="text-xs font-mono text-purple-300 font-bold">SECURITY CONTROL CENTER</span>
          </div>
          <h1 className="text-2xl font-black text-white">⚙️ Admin Management Panel</h1>
          <p className="text-xs text-slate-400">BJS & Bar Academy Student Registrations & Security Approvals</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-3 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'registrations'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📋 Registrations Queue
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'students'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💳 bKash Payments
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold ${
            msg.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-500/30 text-rose-300'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Tab Content 1: Registrations Queue */}
      {activeTab === 'registrations' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-base font-extrabold text-white">📋 Pending Registrations Queue</h2>
          {loading ? (
            <p className="text-xs text-amber-400 font-mono">Loading queue...</p>
          ) : registrations.length === 0 ? (
            <p className="text-xs text-slate-500 py-6">No pending registrations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3">REG ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {registrations.map((r) => (
                    <tr key={r.regId} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono font-bold text-amber-300">{r.regId}</td>
                      <td className="p-3 font-semibold text-white">{r.name}</td>
                      <td className="p-3 font-mono text-slate-300">{r.phone}</td>
                      <td className="p-3 text-slate-300">{r.batch}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {r.status === 'Pending' && (
                          <button
                            onClick={() => handleApproveReg(r.regId)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                          >
                            ✓ Approve & Create Student
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Registered Students */}
      {activeTab === 'students' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-base font-extrabold text-white">👥 Registered Students & Security Guard</h2>
          {loading ? (
            <p className="text-xs text-amber-400 font-mono">Loading students...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3">Student ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Device Guard / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono font-bold text-amber-300">{s.id}</td>
                      <td className="p-3 font-semibold text-white">{s.name}</td>
                      <td className="p-3 font-mono text-slate-300">{s.phone}</td>
                      <td className="p-3 text-slate-300">{s.batch}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleStudentAction(s.id, 'reset_devices')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold"
                          title="Reset device fingerprints"
                        >
                          🔄 Device Reset
                        </button>
                        <button
                          onClick={() =>
                            handleStudentAction(
                              s.id,
                              'update_status',
                              s.status === 'Active' ? 'Blocked' : 'Active'
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            s.status === 'Active'
                              ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {s.status === 'Active' ? '🚫 Suspend' : '✅ Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: bKash Payments */}
      {activeTab === 'payments' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-base font-extrabold text-white">💳 bKash Transactions Verification</h2>
          {loading ? (
            <p className="text-xs text-amber-400 font-mono">Loading payments...</p>
          ) : payments.length === 0 ? (
            <p className="text-xs text-slate-500 py-6">No bKash transactions submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Student ID</th>
                    <th className="p-3">bKash Number</th>
                    <th className="p-3">TrxID</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payments.map((p) => (
                    <tr key={p.paymentId} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono font-bold text-pink-400">{p.paymentId}</td>
                      <td className="p-3 font-mono text-slate-300">{p.studentId}</td>
                      <td className="p-3 font-mono text-slate-300">{p.bkashNumber}</td>
                      <td className="p-3 font-mono font-bold text-amber-300 uppercase">{p.trxId}</td>
                      <td className="p-3 font-mono text-white">৳{p.amount}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'Confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : p.status === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {p.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyPayment(p.paymentId, 'approve')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                            >
                              ✓ Verify & Unlock
                            </button>
                            <button
                              onClick={() => handleVerifyPayment(p.paymentId, 'reject')}
                              className="px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-bold text-[11px]"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
