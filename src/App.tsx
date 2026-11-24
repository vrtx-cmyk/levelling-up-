import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { ActivateAccessPage } from './pages/ActivateAccessPage';
import { VideoLibraryPage } from './pages/VideoLibraryPage';
import { VideoPlayerPage } from './pages/VideoPlayerPage';
import { MyAccountPage } from './pages/MyAccountPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* 1. Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. Public Auth Routes */}
            <Route path="/login" element={<AuthPage initialMode="login" />} />
            <Route path="/signup" element={<AuthPage initialMode="signup" />} />

            {/* 3. Payment Page: "Activate your access" (Logged in, awaiting approval) */}
            {/* Supports both /payment and /activate */}
            <Route
              path="/payment"
              element={
                <ErrorBoundary fallbackMessage="Could not load payment details. Please refresh.">
                  <ProtectedRoute paymentOnly>
                    <ActivateAccessPage />
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />
            <Route
              path="/activate"
              element={
                <ErrorBoundary fallbackMessage="Could not load payment details. Please refresh.">
                  <ProtectedRoute paymentOnly>
                    <ActivateAccessPage />
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />

            {/* 4. Video Library & Watch Player (Approved users only) */}
            <Route
              path="/videos"
              element={
                <ProtectedRoute requireApproved>
                  <VideoLibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos/:id"
              element={
                <ProtectedRoute requireApproved>
                  <VideoPlayerPage />
                </ProtectedRoute>
              }
            />

            {/* 5. My Account (Logged in users) */}
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <MyAccountPage />
                </ProtectedRoute>
              }
            />

            {/* 6. Admin Panel (Admin only) */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
