import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from './lib/toast';
import Layout from './components/Layout';
import AdminLayout from './components/admin/Layout';
import Analytics from './pages/Analytics';
import ProductQuotes from './pages/ProductQuotes';
import Chat from './pages/Chat';
import Inventory from './pages/Inventory';
import Balance from './pages/Balance';
import Audit from './pages/Audit';
import Attribution from './pages/Attribution';
import SettingsPage from './pages/Settings';
import AutomationRules from './pages/AutomationRules';
import Auth from './pages/Auth';
import AdminChat from './pages/admin/Chat';
import AdminProductApprovals from './pages/admin/ProductApprovals';
import AdminProductImport from './pages/admin/ProductImport';
import AdminAIImport from './pages/admin/AIImport';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminQuotes from './pages/admin/Quotes';
import AdminSettings from './pages/admin/Settings';
import AdminManage from './pages/admin/Admins';
import AdminProfileSetup from './pages/admin/ProfileSetup';
import AdminProfileEdit from './pages/admin/ProfileEdit';
import AcceptInvitation from './pages/admin/AcceptInvitation';
import AdminInvoices from './pages/admin/Invoices';
import AdminOrders from './pages/admin/Orders';
import SignUpNew from './pages/SignUpNew';
import Onboarding from './pages/Onboarding';
import ShopifySetup from './pages/ShopifySetup';
import Notifications from './pages/Notifications';
import QuoteReview from './pages/QuoteReview';
import CallbackHandler from './components/shopify/CallbackHandler';
import ShopifyCallback from './pages/ShopifyCallback';
import Pricing from './pages/Pricing';
import Products from './pages/Products';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import DataDeletion from './pages/DataDeletion';
import Form from './pages/Form';
import VerifyEmail from './pages/VerifyEmail';
import CheckEmail from './pages/CheckEmail';
import ConfirmEmail from './pages/ConfirmEmail';
import OAuthGoogleAds from './pages/OAuthGoogleAds';
import Welcome from './pages/Welcome';
import ShopifyWelcome from './pages/ShopifyWelcome';
import SetPassword from './pages/SetPassword';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { PageTitle } from './components/PageTitle';
import { DashboardSkeleton } from './components/PageSkeletons';
import { LoadingPage } from './components/LoadingPage';
import { SubscriptionGuard } from './components/subscription/SubscriptionGuard';

// Protected route component for admin routes
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  if (isLoading || adminLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If trying to access admin routes without admin privileges
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Protected route component for super admin routes
const SuperAdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin();

  if (isLoading || adminLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If admin but not super admin, redirect to admin dashboard
  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

// Protected route component for user routes
const UserProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, emailConfirmed } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const location = useLocation();

  if (isLoading || adminLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only redirect to check-email if:
  // 1. We're not already on the check-email or confirm-email pages
  // 2. Email is explicitly confirmed as false (not undefined/unloaded)
  // 3. User has an email address
  // 4. We didn't just confirm the email (prevents race condition redirect)
  // Note: emailConfirmed will be undefined until profile data is loaded
  const emailJustConfirmed = location.state?.emailJustConfirmed === true;
  const shouldCheckEmail =
    location.pathname !== '/check-email' &&
    location.pathname !== '/confirm-email' &&
    emailConfirmed === false &&
    user.email &&
    !emailJustConfirmed;

  // Debug logging for developers (not shown to users)
  if (emailConfirmed === false) {
    console.log('[UserProtectedRoute] Email not confirmed, redirecting to check-email', {
      pathname: location.pathname,
      emailConfirmed,
      userEmail: user.email
    });
  }

  if (shouldCheckEmail) {
    return <Navigate to="/check-email" replace state={{ email: user.email }} />;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

const ThemedToaster = () => {
  const { effectiveTheme } = useTheme();
  const { isAdmin } = useAdmin();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile && !isAdmin) {
    return null;
  }

  return (
    <Toaster
      position="bottom-right"
      dir="ltr"
      closeButton
      expand={false}
      visibleToasts={5}
      gap={12}
      offset="24px"
      toastOptions={{
        style: {
          maxWidth: '360px',
        },
        className: 'toast-item',
      }}
    />
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <AdminProvider>
            <LoadingProvider>
              <SubscriptionProvider>
              <PageTitle />
              <Routes>
            {/* Admin profile setup - standalone route */}
            <Route path="/admin/profile-setup" element={
              <AdminProtectedRoute>
                <AdminProfileSetup />
              </AdminProtectedRoute>
            } />

            {/* Admin invitation acceptance - public route */}
            <Route path="/admin/accept-invitation" element={<AcceptInvitation />} />

            {/* Admin routes */}
            <Route path="/admin" element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="quotes" element={<AdminQuotes />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="chat" element={<AdminChat />} />
              <Route path="products" element={<AdminProductApprovals />} />
              <Route path="product-import" element={<AdminProductImport />} />
              <Route path="ai-import" element={<AdminAIImport />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="profile" element={<AdminProfileEdit />} />
              <Route path="admins" element={<AdminManage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* Regular auth routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/sign-in" element={<Auth />} />
            <Route path="/sign-up" element={<SignUpNew />} />
            <Route path="/signup" element={<SignUpNew />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />

            {/* Shopify App Store installation routes - publicly accessible */}
            <Route path="/shopify/welcome" element={<ShopifyWelcome />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* Legal pages - publicly accessible */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/data-deletion" element={<DataDeletion />} />

            {/* Help form page - publicly accessible */}
            <Route path="/form" element={<Form />} />

            {/* Onboarding routes */}
            <Route path="/onboarding/*" element={
              <UserProtectedRoute>
                <Onboarding />
              </UserProtectedRoute>
            } />
            <Route path="/onboard/*" element={
              <UserProtectedRoute>
                <Onboarding />
              </UserProtectedRoute>
            } />
            
            {/* Shopify routes */}
            <Route path="/shopify-setup" element={
              <UserProtectedRoute>
                <ShopifySetup />
              </UserProtectedRoute>
            } />
            <Route path="/auth/callback" element={<CallbackHandler />} />
            <Route path="/shopify-callback" element={<ShopifyCallback />} />

            {/* OAuth callback routes */}
            <Route path="/oauth/google-ads" element={<OAuthGoogleAds />} />
            
            {/* Main app routes */}
            <Route path="/" element={
              <UserProtectedRoute>
                <Layout />
              </UserProtectedRoute>
            }>
              {/* Protected routes requiring active subscription */}
              <Route index element={<SubscriptionGuard><Analytics /></SubscriptionGuard>} />
              <Route path="products" element={<SubscriptionGuard><Products /></SubscriptionGuard>} />
              <Route path="quotes" element={<SubscriptionGuard><ProductQuotes /></SubscriptionGuard>} />
              <Route path="chat" element={<SubscriptionGuard><Chat /></SubscriptionGuard>} />
              <Route path="inventory" element={<SubscriptionGuard><Inventory /></SubscriptionGuard>} />
              <Route path="balance" element={<SubscriptionGuard><Balance /></SubscriptionGuard>} />
              <Route path="audit" element={<SubscriptionGuard><Audit /></SubscriptionGuard>} />
              <Route path="pixel" element={<SubscriptionGuard><Attribution /></SubscriptionGuard>} />
              <Route path="notifications" element={<SubscriptionGuard><Notifications /></SubscriptionGuard>} />
              <Route path="quotes/review/:id" element={<SubscriptionGuard><QuoteReview /></SubscriptionGuard>} />
              <Route path="automation" element={<SubscriptionGuard><AutomationRules /></SubscriptionGuard>} />
              <Route path="verify-email" element={<SubscriptionGuard><VerifyEmail /></SubscriptionGuard>} />
              {/* Unprotected routes - users need these to manage subscription */}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="*" element={<SubscriptionGuard><Analytics /></SubscriptionGuard>} />
            </Route>
            </Routes>
            <ThemedToaster />
              </SubscriptionProvider>
            </LoadingProvider>
          </AdminProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
