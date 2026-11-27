import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireSeller, RedirectIfAuthed } from './features/auth/guards'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import SellerLayout from './features/seller/SellerLayout'
import CompanySetupPage from './features/seller/CompanySetupPage'
import DashboardPage from './features/seller/DashboardPage'
import ListingEditorPage from './features/seller/listing/ListingEditorPage'
import CompanyProfilePage from './features/seller/CompanyProfilePage'
import VerificationPage from './features/seller/VerificationPage'
import PickupLocationsPage from './features/seller/PickupLocationsPage'
import BuyerPlaceholder from './features/buyer/BuyerPlaceholder'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Shared auth (same for buyers and sellers) */}
      <Route element={<RedirectIfAuthed />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<Navigate to="/" replace />} />

        {/* ---------- Seller side (Person A) ---------- */}
        <Route path="/seller/setup" element={<CompanySetupPage />} />
        <Route element={<RequireSeller />}>
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="listings" element={<Navigate to="/seller" replace />} />
            <Route path="listings/new" element={<ListingEditorPage />} />
            <Route path="listings/:id/edit" element={<ListingEditorPage />} />
            <Route path="company" element={<CompanyProfilePage />} />
            <Route path="verification" element={<VerificationPage />} />
            <Route path="pickup-locations" element={<PickupLocationsPage />} />
            <Route path="account" element={<Navigate to="/seller/company" replace />} />
          </Route>
        </Route>

        {/* ---------- Buyer side (Person B) ---------- */}
        <Route path="/buyer/*" element={<BuyerPlaceholder />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
