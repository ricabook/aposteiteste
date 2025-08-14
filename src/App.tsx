import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from './config/wagmi';
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import Privacidade from "./pages/Privacidade";
import TermosDeUso from "./pages/TermosDeUso";
import Seguranca from "./pages/Seguranca";
import MeiosDePagamento from "./pages/MeiosDePagamento";
import AdminDashboard from "./pages/AdminDashboard";
import AdminWallet from "./pages/AdminWallet";
import AdminPolls from "./pages/AdminPolls";
import AdminUsers from "./pages/AdminUsers";
import AdminBanners from "./pages/AdminBanners";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import MyWithdrawals from "./pages/MyWithdrawals";
import PollDetail from "./pages/PollDetail";
import OldPollRedirect from "./pages/OldPollRedirect";
import Portfolio from "./pages/Portfolio";
import MyMoney from "./pages/MyMoney";
import MyPolls from "./pages/MyPolls";
import MetaMaskDemo from "./pages/MetaMaskDemo";
import Layout from "./components/Layout";
import AdminMensagens from "./pages/AdminMensagens";
import Suporte from "./pages/Suporte";
import Sitemap from "./components/Sitemap";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If user is logged in and on auth page, redirect to home
  if (user && location.pathname === '/auth') {
    return <Navigate to="/" replace />;
  }
  
  return (
    <Layout onSearch={location.pathname === '/' ? setSearchQuery : undefined}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Index searchQuery={searchQuery} onSearch={setSearchQuery} />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/seguranca" element={<Seguranca />} />
        <Route path="/meios-de-pagamento" element={<MeiosDePagamento />} />
        <Route path="/enquete/:slug" element={<PollDetail />} />
        <Route path="/poll/:id" element={<OldPollRedirect />} />
        <Route path="/sitemap.xml" element={<Sitemap />} />
        
        {/* Protected routes that require authentication */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/portfolio" element={
          <ProtectedRoute>
            <Portfolio />
          </ProtectedRoute>
        } />
        <Route path="/my-money" element={
          <ProtectedRoute>
            <MyMoney />
          </ProtectedRoute>
        } />
        <Route path="/my-polls" element={
          <ProtectedRoute>
            <MyPolls />
          </ProtectedRoute>
        } />
        <Route path="/suporte" element={
          <ProtectedRoute>
            <Suporte />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/wallet" element={
          <ProtectedRoute>
            <AdminWallet />
          </ProtectedRoute>
        } />
        <Route path="/admin/polls" element={
          <ProtectedRoute>
            <AdminPolls />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/mensagens" element={
          <ProtectedRoute>
            <AdminMensagens />
          </ProtectedRoute>
        } />
        <Route path="/admin/banners" element={
          <ProtectedRoute>
            <AdminBanners />
          </ProtectedRoute>
        } />
        <Route path="/admin/withdrawals" element={
          <ProtectedRoute>
            <AdminWithdrawals />
          </ProtectedRoute>
        } />
        <Route path="/my-withdrawals" element={
          <ProtectedRoute>
            <MyWithdrawals />
          </ProtectedRoute>
        } />
        <Route path="/metamask-demo" element={
          <ProtectedRoute>
            <MetaMaskDemo />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
