import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import {
  ArrowLeftRight,
  BookDown,
  BookUp,
  ClockAlert,
  RotateCw,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

const Circulation = () => {
  const [tab, setTab] = useState('active'); // 'active' | 'overdue'
  const [activeLoans, setActiveLoans] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Issue Form State
  const [issueMemberId, setIssueMemberId] = useState('');
  const [issueBarcode, setIssueBarcode] = useState('');
  const [issueLoading, setIssueLoading] = useState(false);

  // Return Form State
  const [returnBarcode, setReturnBarcode] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnReceipt, setReturnReceipt] = useState(null);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const [activeRes, overdueRes] = await Promise.all([
        apiFetch('/circulation/active?limit=50'),
        apiFetch('/circulation/overdue')
      ]);
      if (activeRes.success) setActiveLoans(activeRes.loans);
      if (overdueRes.success) setOverdueLoans(overdueRes.loans);
    } catch (err) {
      setError(err.message || 'Failed to fetch circulation records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    setIssueLoading(true);
    setError('');
    try {
      const res = await apiFetch('/circulation/issue', {
        method: 'POST',
        body: { memberId: issueMemberId, barcode: issueBarcode }
      });
      if (res.success) {
        setToast(res.message);
        setIssueMemberId('');
        setIssueBarcode('');
        fetchLoans();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIssueLoading(false);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setReturnLoading(true);
    setError('');
    try {
      const res = await apiFetch('/circulation/return', {
        method: 'POST',
        body: { barcode: returnBarcode }
      });
      if (res.success) {
        setReturnReceipt(res);
        setReturnBarcode('');
        setToast(res.message);
        fetchLoans();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReturnLoading(false);
    }
  };

  const handleRenew = async (loanId) => {
    try {
      const res = await apiFetch(`/circulation/renew/${loanId}`, { method: 'POST' });
      if (res.success) {
        setToast(res.message);
        fetchLoans();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Return Fine Receipt Banner */}
      {returnReceipt && returnReceipt.fine && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
          <div className="font-bold text-amber-900 flex items-center gap-2">
            <ClockAlert className="w-4 h-4 text-amber-600" />
            Late Return Fine Accrued
          </div>
          <div className="text-amber-800">
            This book was returned {returnReceipt.fine.overdueDays} days late. An outstanding fine of{' '}
            <span className="font-bold">${returnReceipt.fine.amount.toFixed(2)}</span> has been charged to the member.
          </div>
        </div>
      )}

      {/* Quick Action Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Issue Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <BookUp className="w-4 h-4 text-emerald-600" />
            Issue Physical Copy
          </h3>
          <form onSubmit={handleIssue} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Member ObjectId or ID *</label>
              <input
                type="text"
                required
                value={issueMemberId}
                onChange={(e) => setIssueMemberId(e.target.value)}
                placeholder="e.g. member ObjectId or select from directory"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Copy Barcode *</label>
              <input
                type="text"
                required
                value={issueBarcode}
                onChange={(e) => setIssueBarcode(e.target.value)}
                placeholder="e.g. BC-9780132350884-001"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={issueLoading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {issueLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Process Issue Loan
            </button>
          </form>
        </div>

        {/* Return Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <BookDown className="w-4 h-4 text-blue-600" />
            Check-In / Return Copy
          </h3>
          <form onSubmit={handleReturn} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Copy Barcode or Loan ID *</label>
              <input
                type="text"
                required
                value={returnBarcode}
                onChange={(e) => setReturnBarcode(e.target.value)}
                placeholder="Scan or enter BC-XXXXX or LN-XXXXX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              System checks due dates automatically, releases the copy back to inventory, and assesses overdue fines if applicable.
            </p>
            <button
              type="submit"
              disabled={returnLoading}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {returnLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Process Return
            </button>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab('active')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            tab === 'active'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Loans ({activeLoans.length})
        </button>
        <button
          onClick={() => setTab('overdue')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            tab === 'overdue'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClockAlert className="w-3.5 h-3.5" />
          Overdue Loans ({overdueLoans.length})
        </button>
      </div>

      {/* Loan Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Loan ID</th>
                <th className="py-3 px-4">Book & Copy</th>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Renewals</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(tab === 'active' ? activeLoans : overdueLoans).map((l) => {
                const isOverdue = new Date(l.dueDate) < new Date();
                return (
                  <tr key={l._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-slate-600">{l.loanId}</td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="font-bold text-slate-900 truncate">{l.bookId?.title || 'Unknown Title'}</div>
                      <div className="font-mono text-[11px] text-slate-500">{l.copyId?.barcode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{l.memberId?.name}</div>
                      <div className="text-[11px] text-slate-400">{l.memberId?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                        {new Date(l.dueDate).toLocaleDateString()}
                      </div>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-500 uppercase">Overdue</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {l.renewalCount} / {l.maxRenewals || 2}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRenew(l.loanId)}
                        disabled={isOverdue || l.renewalCount >= (l.maxRenewals || 2)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded border border-slate-200 transition-colors"
                        title={isOverdue ? 'Overdue loans cannot be renewed' : 'Renew Loan for 14 days'}
                      >
                        <RotateCw className="w-3 h-3" />
                        Renew
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Circulation;
