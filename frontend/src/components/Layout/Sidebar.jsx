import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookMarked,
  ArrowLeftRight,
  Bookmark,
  Users,
  Receipt,
  FileSpreadsheet,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'librarian';

  const navLinks = [
    ...(isStaff
      ? [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }]
      : []),
    { name: 'Book Catalog', path: isStaff ? '/books' : '/', icon: BookMarked },
    ...(isStaff
      ? [{ name: 'Circulation Desk', path: '/circulation', icon: ArrowLeftRight }]
      : []),
    { name: 'Reservations', path: '/reservations', icon: Bookmark },
    ...(isStaff
      ? [
          { name: 'Members Directory', path: '/members', icon: Users },
          { name: 'Fines & Payments', path: '/fines', icon: Receipt },
          { name: 'Reports & Export', path: '/reports', icon: FileSpreadsheet }
        ]
      : [])
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 left-0 z-40 h-full lg:h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between lg:hidden mb-4 pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800">Menu</span>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Operations
          </div>

          <nav className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            <div className="font-semibold text-slate-700">Circulation Policy</div>
            <div>Period: 14 Days</div>
            <div>Late Fine: $1.00 / day</div>
            <div>Max Fine: $50.00 / loan</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
