import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import {
  BookCopy,
  BookCheck,
  BookUp,
  Users,
  ClockAlert,
  Bookmark,
  DollarSign,
  TrendingUp,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/dashboard/stats');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Loading live library statistics...</span>
        </div>
      </div>
    );
  }

  const { stats, recentCirculation, mostBorrowedTitles, monthlyTrends } = data || {};

  const statCards = [
    { title: 'Total Book Copies', value: stats?.totalCopies ?? 0, icon: BookCopy, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Available Copies', value: stats?.availableCopies ?? 0, icon: BookCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Borrowed Copies', value: stats?.borrowedCopies ?? 0, icon: BookUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Registered Members', value: stats?.registeredMembers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Overdue Loans', value: stats?.overdueLoans ?? 0, icon: ClockAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Pending Reservations', value: stats?.pendingReservations ?? 0, icon: Bookmark, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Outstanding Fines', value: `$${(stats?.outstandingFines ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Overview</h2>
          <p className="text-xs text-slate-500">Live inventory and circulation telemetry</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 truncate">{card.title}</span>
                <div className={`w-8 h-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Recent Circulation Activity & Most Borrowed Titles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Circulation */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Recent Circulation Activity
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2 px-3">Book</th>
                  <th className="py-2 px-3">Barcode</th>
                  <th className="py-2 px-3">Member</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCirculation && recentCirculation.length > 0 ? (
                  recentCirculation.map((loan) => (
                    <tr key={loan._id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[180px] truncate">
                        {loan.bookId?.title || 'Unknown Title'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{loan.copyId?.barcode || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-700">{loan.memberId?.name || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            loan.status === 'returned'
                              ? 'bg-emerald-100 text-emerald-700'
                              : new Date(loan.dueDate) < new Date()
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {loan.status === 'active' && new Date(loan.dueDate) < new Date()
                            ? 'Overdue'
                            : loan.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      No circulation activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Borrowed Titles */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Top Borrowed Titles</h3>
          <div className="space-y-3">
            {mostBorrowedTitles && mostBorrowedTitles.length > 0 ? (
              mostBorrowedTitles.map((b, idx) => (
                <div key={b.bookId || idx} className="flex items-center justify-between text-xs pb-2 border-b border-slate-50 last:border-none">
                  <div className="max-w-[180px]">
                    <div className="font-semibold text-slate-800 truncate">{b.title}</div>
                    <div className="text-slate-400 text-[11px]">{b.category}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                    {b.borrowCount} loans
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">No borrowing records yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
