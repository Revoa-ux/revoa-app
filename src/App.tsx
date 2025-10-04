import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import AdminLayout from './components/admin/Layout';
import DashboardCopy from './pages/DashboardCopy';
import ProductQuotes from './pages/ProductQuotes';
import Chat from './pages/Chat';
import Inventory from './pages/Inventory';
import Balance from './pages/Balance';
import Audit from './pages/Audit';
import Calculator from './pages/Calculator';
import SettingsPage from './pages/Settings';
import Auth from './pages/Auth';
import AdminChat from './pages/admin/Chat';
import AdminProductApprovals from './pages/admin/ProductApprovals';
// import AdminDashboard from './pages/admin/Dashboard';
// import AdminUsers from './pages/admin/Users';
// import AdminQuotes from './pages/admin/Quotes';
// import AdminProducts from './pages/admin/Products';
// import AdminInvoices from './pages/admin/Invoices';
// import AdminSettings from './pages/admin/Settings';
// import AdminManage from './pages/admin/Manage';
import SignUpNew from './pages/SignUpNew';
import Onboarding from './pages/Onboarding';
import ShopifySetup from './pages/ShopifySetup';
import CallbackHandler from './components/shopify/CallbackHandler';
import Pricing from './pages/Pricing';
import Products from './pages/Products';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PageTitle } from './components/PageTitle';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  if (isLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading your account...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If trying to access admin routes without admin privileges
  if (window.location.pathname.startsWith('/admin') && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <LoadingProvider>
            <PageTitle />
            <Routes>
            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="chat" element={<AdminChat />} />
              <Route path="products" element={<AdminProductApprovals />} />
              {/* Other admin routes - temporarily disabled
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="quotes" element={<AdminQuotes />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="admins" element={<AdminManage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} /> */}
            </Route>

            {/* Regular auth routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/sign-in" element={<Auth />} />
            <Route path="/sign-up" element={<SignUpNew />} />
            
            {/* Onboarding routes */}
            <Route path="/onboarding/*" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            
            {/* Shopify routes */}
            <Route path="/shopify-setup" element={
              <ProtectedRoute>
                <ShopifySetup />
              </ProtectedRoute>
            } />
            <Route path="/auth/callback" element={<CallbackHandler />} />
            
            {/* Main app routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardCopy />} />
              <Route path="products" element={<Products />} />
              <Route path="quotes" element={<ProductQuotes />} />
              <Route path="chat" element={<Chat />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="balance" element={<Balance />} />
              <Route path="audit" element={<Audit />} />
              <Route path="calculator" element={<Calculator />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="*" element={<DashboardCopy />} />
            </Route>
            </Routes>
            <Toaster position="top-right" />
          </LoadingProvider>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
