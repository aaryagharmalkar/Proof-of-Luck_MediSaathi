import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import PageNotFound from "@/lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ActiveMemberProvider } from "@/lib/ActiveMemberContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AudioSummary from "@/pages/AudioSummary";
import Appointments from "@/pages/Appointments";
import ProfileSelector from "@/pages/ProfileSelector";
import Dashboard from "@/pages/Dashboard";
import RoleSelect from "@/pages/RoleSelect";
import Login from "@/pages/Login";
import DoctorOnboarding from "@/pages/DoctorOnboarding";
import DoctorDashboard from "@/pages/DoctorDashboard";
import DoctorPatients from "@/pages/DoctorPatients";
import DoctorPatientDetail from "@/pages/DoctorPatientDetail";




const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
  } = useAuth();

  // Global loading state
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  // Auth error handling
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }

    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <ActiveMemberProvider>
    <Routes>
      {/* Main page */}
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />

      {/* Dynamic pages */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      <Route path="/appointments" element={<LayoutWrapper currentPageName="appointments"><Appointments /></LayoutWrapper>} />
      <Route path="/audio-summary" element={<LayoutWrapper currentPageName="audio-summary"><AudioSummary /></LayoutWrapper>} />
      <Route path="/profiles" element={<LayoutWrapper currentPageName="profiles"><ProfileSelector /></LayoutWrapper>} />
      <Route path="/dashboard" element={<LayoutWrapper currentPageName="dashboard"><Dashboard /></LayoutWrapper>} />

      {/* Role selection (patient vs doctor) */}
      <Route path="/role-select" element={<RoleSelect />} />

      {/* Doctor flow: login uses same Login page, then onboarding or dashboard */}
      <Route path="/doctor-login" element={<Login />} />
      <Route path="/doctor-onboarding" element={<DoctorOnboarding />} />
      <Route path="/doctor-dashboard" element={<LayoutWrapper currentPageName="doctor-dashboard"><DoctorDashboard /></LayoutWrapper>} />
      <Route path="/doctor-dashboard/patients" element={<LayoutWrapper currentPageName="doctor-patients"><DoctorPatients /></LayoutWrapper>} />
      <Route path="/doctor-dashboard/patients/:patientId" element={<LayoutWrapper currentPageName="doctor-patient-detail"><DoctorPatientDetail /></LayoutWrapper>} />

      {/* 404 */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </ActiveMemberProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={false}>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>

          {/* Toasts */}
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
