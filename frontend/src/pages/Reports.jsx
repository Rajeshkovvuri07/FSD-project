import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Reports = () => {
  const [circulationStatus, setCirculationStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadingCirculation, setDownloadingCirculation] = useState(false);
  const [downloadingInventory, setDownloadingInventory] = useState(false);
  const [message, setMessage] = useState('');

  const handleDownloadCirculation = async () => {
    setDownloadingCirculation(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (circulationStatus !== 'all') params.append('status', circulationStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const blob = await apiFetch(`/reports/circulation/csv?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `circulation-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setMessage('Circulation report successfully exported to CSV.');
    } catch (err) {
      alert(err.message || 'Error downloading circulation CSV');
    } finally {
      setDownloadingCirculation(false);
    }
  };

  const handleDownloadInventory = async () => {
    setDownloadingInventory(true);
    setMessage('');
    try {
      const blob = await apiFetch('/reports/inventory/csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setMessage('Catalog inventory report successfully exported to CSV.');
    } catch (err) {
      alert(err.message || 'Error downloading inventory CSV');
    } finally {
      setDownloadingInventory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Reports & Data Exports</h2>
        <p className="text-xs text-slate-500">
          Generate audit-compliant CSV reports with automatic spreadsheet formula injection protection (CWE-1236)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Circulation Report Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Circulation Transactions Report</h3>
                <p className="text-xs text-slate-500">Exports all book issues, returns, due dates, and fine balances</p>
              </div>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loan Status Filter</label>
                <select
                  value={circulationStatus}
                  onChange={(e) => setCirculationStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="all">All Loans (Active & Returned)</option>
                  <option value="active">Active Only</option>
                  <option value="returned">Returned Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadCirculation}
            disabled={downloadingCirculation}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            {downloadingCirculation ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Circulation CSV
          </button>
        </div>

        {/* Inventory Report Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Catalog Inventory Report</h3>
                <p className="text-xs text-slate-500">Comprehensive list of all book titles, total copies, and availability</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Security & Formula Injection Protection
              </div>
              <p>
                All exported cells starting with <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">=</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">+</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">-</code>, or <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">@</code> are automatically sanitized with leading apostrophes to protect against CSV injection attacks in Excel and Google Sheets.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadInventory}
            disabled={downloadingInventory}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            {downloadingInventory ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Full Inventory CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
