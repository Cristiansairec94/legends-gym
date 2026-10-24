import { Routes, Route, Navigate } from 'react-router-dom';

import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/admin/AdminLayout';
import { AdminRoute, ProtectedRoute } from './components/layout/ProtectedRoute';
import Toaster from './components/common/Toaster';
import ScrollToTop from './components/layout/ScrollToTop';

// Public pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import Plans from './pages/public/Plans';
import Trainers from './pages/public/Trainers';
import TrainerDetail from './pages/public/TrainerDetail';
import Products from './pages/public/Products';
import ProductDetail from './pages/public/ProductDetail';
import Gallery from './pages/public/Gallery';
import Contact from './pages/public/Contact';
import Cart from './pages/public/Cart';
import Checkout from './pages/public/Checkout';
import Appointment from './pages/public/Appointment';
import MembershipRegister from './pages/public/MembershipRegister';
import AccountDashboard from './pages/account/AccountDashboard';

// Auth pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import AdminLogin from './pages/auth/AdminLogin';

// Admin pages
import Dashboard from './pages/admin/Dashboard';
import AdminMembers from './pages/admin/Members';
import AdminPlans from './pages/admin/Plans';
import AdminMemberships from './pages/admin/Memberships';
import AdminPayments from './pages/admin/Payments';
import AdminAppointments from './pages/admin/Appointments';
import AdminTrainers from './pages/admin/Trainers';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminServices from './pages/admin/ServicesFacilities';
import AdminReviews from './pages/admin/Reviews';
import AdminGallery from './pages/admin/Gallery';
import AdminEnquiries from './pages/admin/Enquiries';
import AdminContent from './pages/admin/Content';
import AdminBanners from './pages/admin/Banners';
import AdminSettings from './pages/admin/Settings';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ---------- Public site ---------- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/trainers" element={<Trainers />} />
          <Route path="/trainers/:id" element={<TrainerDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/register" element={<MembershipRegister />} />
          <Route path="/account" element={<ProtectedRoute><AccountDashboard /></ProtectedRoute>} />
        </Route>

        {/* ---------- Auth ---------- */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ---------- Admin dashboard ---------- */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="memberships" element={<AdminMemberships />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="trainers" element={<AdminTrainers />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* ---------- Fallback ---------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </>
  );
}
