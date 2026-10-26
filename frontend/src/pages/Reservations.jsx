import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/Common/ConfirmationModal';
import { Bookmark, CheckCircle, AlertCircle, X, Ban } from 'lucide-react';

const Reservations = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [toast, setToast] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/reservations?status=all');
      if (res.success) {
        setReservations(res.reservations);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/reservations/${cancelTargetId}/cancel`, {
        method: 'PATCH'
      });
      if (res.success) {
        setToast('Reservation cancelled successfully.');
        setCancelTargetId(null);
        fetchReservations();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reservations Waitlist</h2>
        <p className="text-xs text-slate-500">
          {user?.role === 'member'
            ? 'Track your active book reservations and waitlist position'
            : 'Manage member reservation queues and waitlist ordering'}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Reserved By</th>
                <th className="py-3 px-4">Queue Pos</th>
                <th className="py-3 px-4">Reservation Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading reservations...</td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No active reservations recorded.</td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-[220px] truncate">
                      {r.bookId?.title || 'Unknown Title'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.memberId?.name} ({r.memberId?.email})</td>
                    <td className="py-3 px-4">
                      {r.status === 'pending' ? (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold font-mono">
                          #{r.queuePosition}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(r.reservationDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : r.status === 'fulfilled'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => setCancelTargetId(r._id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this reservation? Subsequent members in the queue will be promoted."
        confirmText="Cancel Reservation"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
};

export default Reservations;
