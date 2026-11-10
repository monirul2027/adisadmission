import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingPage from "./pages/LandingPage";
import StudentLogin from "./pages/StudentLogin";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminSetup from "./pages/AdminSetup";
import StudentDashboard from "./pages/StudentDashboard";
import NewAdmissionForm from "./pages/NewAdmissionForm";
import AdmissionTestForm from "./pages/AdmissionTestForm";
import AdminDashboard from "./pages/AdminDashboard";
import FormSettings from "./pages/FormSettings";
import SiteEditor from "./pages/SiteEditor";
import PrintAdmission from "./pages/PrintAdmission";
import PrintAdmissionTest from "./pages/PrintAdmissionTest";
import PrintAdmitCard from "./pages/PrintAdmitCard";
import NotFound from "./pages/NotFound";

// Disable React Query window focus listener completely so Android's "Change Keyboard" system dialog never triggers refetches or state updates.
focusManager.setEventListener(() => () => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, refetchOnReconnect: false } },
});

const isEditableElement = (el: Element | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
};

const App = () => {
  useEffect(() => {
    // When Android opens the native "Change Keyboard" system dialog on spacebar long-press,
    // the OS window briefly takes focus from Chrome, firing window blur / visibilitychange.
    // Shield active text inputs so background libraries (Supabase GoTrue, Radix, etc.) do not
    // run focus/visibility callbacks that restart the IME and collapse Gboard.
    const shieldWhenTyping = (event: Event) => {
      if (isEditableElement(document.activeElement)) {
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("blur", shieldWhenTyping, true);
    window.addEventListener("focus", shieldWhenTyping, true);
    document.addEventListener("visibilitychange", shieldWhenTyping, true);
    window.addEventListener("visibilitychange", shieldWhenTyping, true);

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableElement(event.target as Element | null)) {
        void supabase.auth.stopAutoRefresh();
      }
    };
    const handleFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Element | null;
      if (!isEditableElement(next) && !isEditableElement(document.activeElement)) {
        void supabase.auth.startAutoRefresh();
      }
    };

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);

    return () => {
      window.removeEventListener("blur", shieldWhenTyping, true);
      window.removeEventListener("focus", shieldWhenTyping, true);
      document.removeEventListener("visibilitychange", shieldWhenTyping, true);
      window.removeEventListener("visibilitychange", shieldWhenTyping, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
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
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<FormSettings />} />
            <Route path="/admin/site-editor" element={<SiteEditor />} />
            <Route path="/admin-setup" element={<AdminSetup />} />
            {/* Print routes */}
            <Route path="/print/admission/:id" element={<PrintAdmission />} />
            <Route path="/print/admit-card/:id" element={<PrintAdmitCard />} />
            <Route path="/print/test/:id" element={<PrintAdmissionTest />} />
            {/* Legacy redirects */}
            <Route path="/login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
