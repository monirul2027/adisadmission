import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import StudentLogin from "./pages/StudentLogin";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminSetup from "./pages/AdminSetup";
import StudentDashboard from "./pages/StudentDashboard";
import NewAdmissionForm from "./pages/NewAdmissionForm";
import AdmissionTestForm from "./pages/AdmissionTestForm";
import AdminDashboard from "./pages/AdminDashboard";
import FormSettings from "./pages/FormSettings";
import PrintAdmission from "./pages/PrintAdmission";
import PrintAdmitCard from "./pages/PrintAdmitCard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Student routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/new-admission" element={<NewAdmissionForm />} />
          <Route path="/student/admission-test" element={<AdmissionTestForm />} />
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<FormSettings />} />
          <Route path="/admin-setup" element={<AdminSetup />} />
          {/* Print routes */}
          <Route path="/print/admission/:id" element={<PrintAdmission />} />
          <Route path="/print/admit-card/:id" element={<PrintAdmitCard />} />
          <Route path="/print/test/:id" element={<PrintAdmission />} />
          {/* Legacy redirects */}
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
