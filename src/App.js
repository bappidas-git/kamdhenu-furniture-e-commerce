import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { AnimatePresence, MotionConfig } from "framer-motion";

// Context Providers
import { ThemeContextProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";
import { AdminProvider } from "./context/AdminContext";
import { WishlistProvider } from "./context/WishlistContext";
import { DealsConfigProvider } from "./context/DealsConfigContext";

// Layout Components
import Header from "./components/Header/Header";
import BottomNav from "./components/BottomNav/BottomNav";
import Footer from "./components/Footer/Footer";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import PageTransition from "./components/PageTransition/PageTransition";
import SkipLink, { MAIN_CONTENT_ID } from "./components/SkipLink/SkipLink";
import LazyPageBoundary from "./components/LazyPage/LazyPage";
import AdminLayout from "./components/AdminLayout/AdminLayout";

// Storefront Pages. Home, the listing and the product page load with the
// app; the rest load on their first visit (React.lazy, src/pages/lazyPages.js).
import Home from "./pages/Home/Home";
import Products from "./pages/Products/Products";
import ProductDetails from "./pages/ProductDetails/ProductDetails";
import {
  AboutUs,
  Checkout,
  CookiePolicy,
  HelpCenter,
  NotFound,
  OrderConfirmation,
  OrderHistory,
  PrivacyPolicy,
  Profile,
  RefundPolicy,
  SpecialOffers,
  Support,
  TermsOfService,
  Wishlist,
} from "./pages/lazyPages";

// Admin Pages (in the main bundle, eager, as before)
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminProducts from "./pages/Admin/AdminProducts";
import AdminCategories from "./pages/Admin/AdminCategories";
import AdminOrders from "./pages/Admin/AdminOrders";
import AdminReturns from "./pages/Admin/AdminReturns";
import AdminPayments from "./pages/Admin/AdminPayments";
import AdminUsers from "./pages/Admin/AdminUsers";
import AdminShipping from "./pages/Admin/AdminShipping";
import AdminCoupons from "./pages/Admin/AdminCoupons";
import AdminSpecialOffers from "./pages/Admin/AdminSpecialOffers";
import AdminReviews from "./pages/Admin/AdminReviews";
import AdminLeads from "./pages/Admin/AdminLeads";
import AdminSettings from "./pages/Admin/AdminSettings";

import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
    <ThemeContextProvider>
      <AuthProvider>
        <AdminProvider>
          <WishlistProvider>
            <CartProvider>
              <OrderProvider>
                <Router>
                  <ScrollToTop />
                  <CssBaseline />
                  <Routes>
                    {/* Admin Routes */}
                    <Route path="/admin">
                      <Route index element={<AdminLogin />} />
                      <Route element={<AdminLayout />}>
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="categories" element={<AdminCategories />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="returns" element={<AdminReturns />} />
                        <Route path="payments" element={<AdminPayments />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="shipping" element={<AdminShipping />} />
                        <Route path="coupons" element={<AdminCoupons />} />
                        <Route path="special-offers" element={<AdminSpecialOffers />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="leads" element={<AdminLeads />} />
                        <Route path="settings" element={<AdminSettings />} />
                      </Route>
                    </Route>

                    {/* Storefront Routes */}
                    <Route
                      path="/*"
                      element={
                        <DealsConfigProvider>
                        {/* Storefront framer-motion animations honour the OS
                            reduced-motion setting: transforms are skipped,
                            opacity still fades. The admin routes are not wrapped. */}
                        <MotionConfig reducedMotion="user">
                        <div className="App">
                          {/* "Skip to content" (<a class="sf-skip-link"
                              href="#main-content">): the first focusable
                              element, before the header. It also takes focus
                              left outside <main> on a route change; see SkipLink. */}
                          <SkipLink />
                          <Header />
                          {/* The page fade (240ms, opacity only) runs on <main>
                              when the path changes; see PageTransition. <Routes>
                              is not keyed by location, so AnimatePresence runs no
                              exit animations and no page waits for another. The
                              skip link's target: focusable from script only.
                              LazyPageBoundary: a page fetched on its first visit
                              waits inside <main> (a quiet skeleton), with the
                              shell around it unchanged. */}
                          <PageTransition id={MAIN_CONTENT_ID} tabIndex={-1} className="main-content">
                            <LazyPageBoundary>
                            <AnimatePresence mode="wait">
                              <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/products" element={<Products />} />
                                {/* Product detail resolves by human-readable slug;
                                    legacy numeric /products/:id still resolves and
                                    redirects to the canonical slug URL. */}
                                <Route path="/products/:slug" element={<ProductDetails />} />
                                <Route path="/checkout" element={<Checkout />} />
                                <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
                                <Route path="/orders" element={<OrderHistory />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/wishlist" element={<Wishlist />} />
                                <Route path="/special-offers" element={<SpecialOffers />} />
                                <Route path="/help" element={<HelpCenter />} />
                                <Route path="/support" element={<Support />} />
                                <Route path="/about" element={<AboutUs />} />
                                <Route path="/privacy" element={<PrivacyPolicy />} />
                                <Route path="/terms" element={<TermsOfService />} />
                                <Route path="/cookies" element={<CookiePolicy />} />
                                <Route path="/refund" element={<RefundPolicy />} />
                                {/* Any other URL: the 404 page, inside the storefront
                                    shell (until Prompt 28 it redirected to "/"). */}
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </AnimatePresence>
                            </LazyPageBoundary>
                          </PageTransition>
                          <Footer />
                          <BottomNav />
                        </div>
                        </MotionConfig>
                        </DealsConfigProvider>
                      }
                    />
                  </Routes>
                </Router>
              </OrderProvider>
            </CartProvider>
          </WishlistProvider>
        </AdminProvider>
      </AuthProvider>
    </ThemeContextProvider>
    </ErrorBoundary>
  );
}

export default App;
