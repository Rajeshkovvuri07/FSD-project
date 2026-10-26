import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import ConfirmationModal from '../components/Common/ConfirmationModal';
import {
  Users,
  Search,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  History,
  CheckCircle,
  X
} from 'lucide-react';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberLoans, setMemberLoans] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [statusTargetMember, setStatusTargetMember] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Member Form
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: 'Password@123',
    phone: '',
    address: '',
    borrowingLimit: 5
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await apiFetch(`/members?${params.toString()}`);
      if (res.success) {
        setMembers(res.members);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, status]);

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await apiFetch('/members', {
        method: 'POST',
        body: newMember
      });
      if (res.success) {
        setIsAddModalOpen(false);
        setToast(`Member '${res.member.name}' registered successfully.`);
        fetchMembers();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusTargetMember) return;
    setActionLoading(true);
    const isSuspending = statusTargetMember.status === 'active';
    const endpoint = isSuspending
      ? `/members/${statusTargetMember._id}/suspend`
      : `/members/${statusTargetMember._id}/reactivate`;

    try {
      const res = await apiFetch(endpoint, {
        method: 'PATCH',
        body: { reason: 'Administrative QA review' }
      });
      if (res.success) {
        setToast(res.message);
        setStatusTargetMember(null);
        fetchMembers();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openHistoryModal = async (member) => {
    setSelectedMember(member);
    setIsHistoryModalOpen(true);
    try {
      const res = await apiFetch(`/members/${member._id}/loans`);
      if (res.success) setMemberLoans(res.loans);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Member Management</h2>
          <p className="text-xs text-slate-500">Manage registered library cardholders, borrowing privileges, and status</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
            placeholder="Search members by name, email, or library ID..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-500">Status:</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Library ID</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Borrowing Limit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m._id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{m.memberId || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-600">{m.email}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{m.borrowingLimit} books</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openHistoryModal(m)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-1"
                      >
                        <History className="w-3 h-3" />
                        Loans
                      </button>
                      <button
                        onClick={() => setStatusTargetMember(m)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                          m.status === 'active'
                            ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {m.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Register New Member</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMember} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Borrowing Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newMember.borrowingLimit}
                    onChange={(e) => setNewMember({ ...newMember, borrowingLimit: parseInt(e.target.value, 10) || 5 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  {actionLoading ? 'Saving...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member History Modal */}
      {isHistoryModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Loan History</h3>
                <p className="text-xs text-slate-500">{selectedMember.name} ({selectedMember.email})</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {memberLoans.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No loan records found for this member.</div>
              ) : (
                <div className="space-y-2">
                  {memberLoans.map((l) => (
                    <div key={l._id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{l.bookId?.title}</div>
                        <div className="font-mono text-[11px] text-slate-500">Due: {new Date(l.dueDate).toLocaleDateString()}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === 'returned' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {l.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(statusTargetMember)}
        onClose={() => setStatusTargetMember(null)}
        onConfirm={handleStatusToggle}
        title={statusTargetMember?.status === 'active' ? 'Suspend Member Account' : 'Reactivate Member Account'}
        message={
          statusTargetMember?.status === 'active'
            ? `Are you sure you want to suspend member '${statusTargetMember?.name}'? Suspended members are prohibited from borrowing new books.`
            : `Reactivate member '${statusTargetMember?.name}'? Borrowing privileges will be restored.`
        }
        confirmText={statusTargetMember?.status === 'active' ? 'Suspend Member' : 'Reactivate'}
        variant={statusTargetMember?.status === 'active' ? 'danger' : 'primary'}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default Members;
