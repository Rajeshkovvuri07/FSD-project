import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/Common/ConfirmationModal';
import {
  Search,
  Plus,
  Filter,
  Book,
  Archive,
  Layers,
  CheckCircle,
  AlertCircle,
  Bookmark,
  X
} from 'lucide-react';

const Books = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'librarian';
  const isAdmin = user?.role === 'admin';

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCopiesModalOpen, setIsCopiesModalOpen] = useState(false);
  const [isAddCopiesModalOpen, setIsAddCopiesModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookCopies, setSelectedBookCopies] = useState([]);
  const [copiesCountToAdd, setCopiesCountToAdd] = useState(1);
  const [archiveTargetBook, setArchiveTargetBook] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Add Book Form State
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    category: 'Computer Science',
    publishedYear: 2024,
    description: '',
    initialCopies: 1
  });

  const categories = ['All', 'Computer Science', 'Fiction', 'Science', 'Philosophy', 'History', 'Biography'];

  const fetchBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        category,
        availableOnly: availableOnly.toString(),
        status: 'all'
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await apiFetch(`/books?${params.toString()}`);
      if (res.success) {
        setBooks(res.books);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load book catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [page, category, availableOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBooks();
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await apiFetch('/books', {
        method: 'POST',
        body: newBook
      });
      if (res.success) {
        setIsAddModalOpen(false);
        setToast(`Book '${res.book.title}' created successfully.`);
        fetchBooks();
      }
    } catch (err) {
      alert(err.message || 'Error creating book');
    } finally {
      setActionLoading(false);
    }
  };

  const openCopiesModal = async (book) => {
    setSelectedBook(book);
    setIsCopiesModalOpen(true);
    try {
      const res = await apiFetch(`/books/${book._id}`);
      if (res.success) {
        setSelectedBookCopies(res.copies);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddCopies = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/books/${selectedBook._id}/copies`, {
        method: 'POST',
        body: { count: copiesCountToAdd }
      });
      if (res.success) {
        setIsAddCopiesModalOpen(false);
        setToast(`Added ${copiesCountToAdd} copies to '${selectedBook.title}'.`);
        fetchBooks();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTargetBook) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/books/${archiveTargetBook._id}/archive`, {
        method: 'PATCH'
      });
      if (res.success) {
        setToast(`Book '${archiveTargetBook.title}' ${res.book.status === 'archived' ? 'archived' : 'restored'}.`);
        setArchiveTargetBook(null);
        fetchBooks();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReserve = async (bookId, title) => {
    try {
      const res = await apiFetch('/reservations', {
        method: 'POST',
        body: { bookId }
      });
      if (res.success) {
        setToast(res.message);
        fetchBooks();
      }
    } catch (err) {
      alert(err.message);
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

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Book Catalog & Inventory</h2>
          <p className="text-xs text-slate-500">Search titles, track copy circulation, and manage availability</p>
        </div>
        {isStaff && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Title
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, ISBN, or publisher..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => { setAvailableOnly(e.target.checked); setPage(1); }}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            Available Only
          </label>
        </div>
      </div>

      {/* Catalog Grid / Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading catalog...</div>
      ) : books.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Book className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No books found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or filter options.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">ISBN</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Available / Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 max-w-[280px]">
                      <div className="font-bold text-slate-900">{b.title}</div>
                      <div className="text-slate-500">{b.author} {b.publishedYear ? `(${b.publishedYear})` : ''}</div>
                      <div className="text-[11px] text-slate-400">{b.publisher}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{b.isbn}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${b.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {b.availableCopies}
                      </span>
                      <span className="text-slate-400"> / {b.totalCopies}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        b.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openCopiesModal(b)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                        >
                          View Copies
                        </button>
                        {isStaff && (
                          <button
                            onClick={() => { setSelectedBook(b); setIsAddCopiesModalOpen(true); }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                          >
                            + Copies
                          </button>
                        )}
                        {!isStaff && b.availableCopies === 0 && (
                          <button
                            onClick={() => handleReserve(b._id, b.title)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 rounded border border-purple-200 transition-colors flex items-center gap-1"
                          >
                            <Bookmark className="w-3 h-3" />
                            Reserve
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setArchiveTargetBook(b)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title={b.status === 'archived' ? 'Restore Book' : 'Archive Book'}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Add New Book to Catalog</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBook} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ISBN (10 or 13 digits) *</label>
                  <input
                    type="text"
                    required
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={newBook.publisher}
                    onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Copies *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newBook.initialCopies}
                    onChange={(e) => setNewBook({ ...newBook, initialCopies: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={newBook.description}
                  onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
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
                  {actionLoading ? 'Saving...' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Copies Modal */}
      {isCopiesModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Physical Copies Inventory</h3>
                <p className="text-xs text-slate-500">{selectedBook.title}</p>
              </div>
              <button onClick={() => setIsCopiesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {selectedBookCopies.map((c) => (
                  <div key={c._id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Copy #{c.copyNumber}</span>
                      <span className="font-mono text-slate-500 ml-2">[{c.barcode}]</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 capitalize">{c.condition}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Copies Modal */}
      {isAddCopiesModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Add Copies</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedBook.title}</p>
            <form onSubmit={handleAddCopies} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Number of copies to add</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={copiesCountToAdd}
                  onChange={(e) => setCopiesCountToAdd(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCopiesModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded font-semibold"
                >
                  {actionLoading ? 'Adding...' : 'Add Copies'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(archiveTargetBook)}
        onClose={() => setArchiveTargetBook(null)}
        onConfirm={handleArchiveConfirm}
        title={archiveTargetBook?.status === 'archived' ? 'Restore Book' : 'Archive Book'}
        message={
          archiveTargetBook?.status === 'archived'
            ? `Are you sure you want to restore '${archiveTargetBook?.title}' to the active catalog?`
            : `Are you sure you want to archive '${archiveTargetBook?.title}'? If active loans exist, archiving will be blocked.`
        }
        confirmText={archiveTargetBook?.status === 'archived' ? 'Restore' : 'Archive'}
        variant={archiveTargetBook?.status === 'archived' ? 'primary' : 'danger'}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default Books;
