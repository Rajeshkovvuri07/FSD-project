import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/Common/ConfirmationModal';
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Receipt,
  X,
  FileCheck2
} from 'lucide-react';

const Fines = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');

  // Payment Modal
  const [payTargetFine, setPayTargetFine] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [lastReceipt, setLastReceipt] = useState(null);

  // Waive Modal
  const [waiveTargetFine, setWaiveTargetFine] = useState(null);
  const [waiveReason, setWaiveReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchFines = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/fines?status=${filter}`);
      if (res.success) {
        setFines(res.fines);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, [filter]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payTargetFine) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/fines/${payTargetFine._id}/pay`, {
        method: 'POST',
        body: { amount: parseFloat(payAmount), method: payMethod }
      });
      if (res.success) {
        setLastReceipt(res.receipt);
        setPayTargetFine(null);
        setPayAmount('');
        setToast(`Payment of $${res.receipt.amount.toFixed(2)} recorded. Receipt: ${res.receipt.receiptNumber}`);
        fetchFines();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaiveSubmit = async (e) => {
    e.preventDefault();
    if (!waiveTargetFine) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/fines/${waiveTargetFine._id}/waive`, {
        method: 'PATCH',
        body: { reason: waiveReason }
      });
      if (res.success) {
        setWaiveTargetFine(null);
        setWaiveReason('');
        setToast('Fine waived successfully.');
        fetchFines();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast('')} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Payment Receipt Banner */}
      {lastReceipt && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
          <div className="font-bold text-emerald-900 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            Payment Receipt Generated
          </div>
          <div className="text-emerald-800">
            Receipt: <span className="font-mono font-bold">{lastReceipt.receiptNumber}</span> | Amount Paid: ${lastReceipt.amount.toFixed(2)} | Method: {lastReceipt.method} | Remaining Balance: ${lastReceipt.remainingBalance.toFixed(2)}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fines & Fee Settlement</h2>
          <p className="text-xs text-slate-500">Record physical counter payments, review late return fees, and authorized waivers</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-500">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Fines</option>
            <option value="outstanding">Outstanding Only</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </select>
        </div>
      </div>

      {/* Fines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Associated Loan & Book</th>
                <th className="py-3 px-4">Overdue Days</th>
                <th className="py-3 px-4">Total Fee</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading fine records...</td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">No fine records found.</td>
                </tr>
              ) : (
                fines.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{f.memberId?.name}</div>
                      <div className="text-[11px] text-slate-400">{f.memberId?.email}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="font-semibold text-slate-800 truncate">{f.loanId?.bookId?.title || 'Returned Book'}</div>
                      <div className="font-mono text-[11px] text-slate-400">{f.loanId?.loanId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{f.overdueDays} days</td>
                    <td className="py-3 px-4 font-bold text-slate-900">${f.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">${f.paidAmount.toFixed(2)}</td>
                    <td className="py-3 px-4 font-bold text-rose-600">${f.balance.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === 'outstanding'
                            ? 'bg-rose-100 text-rose-700'
                            : f.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {f.status === 'outstanding' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setPayTargetFine(f); setPayAmount(f.balance.toString()); }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                          >
                            Pay
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setWaiveTargetFine(f)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200"
                            >
                              Waive
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Modal */}
      {payTargetFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Record In-Person Fine Payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Member: <span className="font-semibold text-slate-800">{payTargetFine.memberId?.name}</span> (Balance: ${payTargetFine.balance.toFixed(2)})
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payTargetFine.balance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="cash">Cash (Front Desk)</option>
                  <option value="card_terminal">POS Card Terminal</option>
                  <option value="library_credit">Library Member Credit</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayTargetFine(null)}
                  className="px-3 py-1.5 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700"
                >
                  {actionLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waive Modal */}
      {waiveTargetFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Waive Outstanding Fine</h3>
            <p className="text-xs text-slate-500 mb-4">
              Authorized waiver for <span className="font-semibold">{waiveTargetFine.memberId?.name}</span> (${waiveTargetFine.balance.toFixed(2)})
            </p>
            <form onSubmit={handleWaiveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justification Reason * (required for audit)</label>
                <textarea
                  rows="3"
                  required
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="e.g. Medical emergency documentation provided, approved by Chief Librarian"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWaiveTargetFine(null)}
                  className="px-3 py-1.5 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded font-semibold hover:bg-rose-700"
                >
                  {actionLoading ? 'Waiving...' : 'Confirm Waiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fines;
