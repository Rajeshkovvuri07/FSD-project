import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Circulation from './pages/Circulation';
import Reservations from './pages/Reservations';
import Members from './pages/Members';
import Fines from './pages/Fines';
import Reports from './pages/Reports';

const ProtectedRoute = ({ children, requireStaff = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireStaff && user.role !== 'admin' && user.role !== 'librarian') {
    return <Navigate to="/" replace />;
  }

  return children;
};

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              {user?.role === 'admin' || user?.role === 'librarian' ? <Dashboard /> : <Books />}
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/books"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Books />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/circulation"
        element={
          <ProtectedRoute requireStaff>
            <MainLayout>
              <Circulation />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reservations"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Reservations />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/members"
        element={
          <ProtectedRoute requireStaff>
            <MainLayout>
              <Members />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/fines"
        element={
          <ProtectedRoute requireStaff>
            <MainLayout>
              <Fines />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute requireStaff>
            <MainLayout>
              <Reports />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
