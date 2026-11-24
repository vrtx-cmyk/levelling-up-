import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireApproved?: boolean;
  paymentOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireApproved = false,
  paymentOnly = false,
}) => {
  const { user, profile, loading, isAdmin, isApproved } = useAuth();
  const location = useLocation();

  const isPaymentPath =
    paymentOnly || location.pathname === '/payment' || location.pathname === '/activate';

  console.log('[ProtectedRoute] Guard checking:', {
    path: location.pathname,
    loading,
    hasUser: !!user,
    userId: user?.id,
    hasProfile: !!profile,
    profileStatus: profile?.status,
    isAdmin,
    isApproved,
    requireAdmin,
    requireApproved,
    isPaymentPath,
  });

  // 1. MUST wait for both session and profile loading to finish before ANY redirect!
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
          <p className="text-sm text-neutral-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // 2. Not logged in at all -> redirect to /login
  if (!user) {
    console.warn(`[ProtectedRoute] ⛔ User not logged in. Redirecting to /login from ${location.pathname}`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Payment page route guards (/payment & /activate)
  // Requirement 1: Approved users must be redirected from /payment to /videos, admins to /admin.
  // Only users with status none / pending / rejected can see /payment.
  if (isPaymentPath) {
    if (isAdmin) {
      console.log('[ProtectedRoute] ➡️ Administrator on payment page, redirecting to /admin');
      return <Navigate to="/admin" replace />;
    }
    if (isApproved || profile?.status === 'approved') {
      console.log('[ProtectedRoute] ➡️ Approved user on payment page, redirecting to /videos');
      return <Navigate to="/videos" replace />;
    }
    // Users with status 'none' | 'pending' | 'rejected' or missing profile can view payment page
    return <>{children}</>;
  }

  // 4. User is logged in on normal protected routes, but profile is missing
  if (!profile) {
    console.warn(`[ProtectedRoute] ⚠️ User ${user.id} logged in, but profile is missing. Redirecting to /payment`);
    return <Navigate to="/payment" replace />;
  }

  // 5. Admin route access check
  if (requireAdmin && !isAdmin) {
    console.warn('[ProtectedRoute] ⛔ Admin privileges required. Redirecting based on membership status...');
    if (isApproved) {
      return <Navigate to="/videos" replace />;
    }
    return <Navigate to="/payment" replace />;
  }

  // 6. Approved membership check (for Video Library & Watch pages)
  if (requireApproved && !isApproved && !isAdmin) {
    console.warn(`[ProtectedRoute] ⛔ Approved membership required (current status: ${profile.status}). Redirecting to /payment`);
    return <Navigate to="/payment" replace />;
  }

  return <>{children}</>;
};
