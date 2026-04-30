import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingGate } from "@/components/OnboardingGate";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import CalendarPage from "./pages/CalendarPage";
import WeekPage from "./pages/WeekPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingGate><Onboarding /></OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route path="/app" element={<ProtectedRoute><OnboardingGate><CalendarPage /></OnboardingGate></ProtectedRoute>} />
            <Route path="/app/week" element={<ProtectedRoute><OnboardingGate><WeekPage /></OnboardingGate></ProtectedRoute>} />
            <Route path="/app/dashboard" element={<ProtectedRoute><OnboardingGate><DashboardPage /></OnboardingGate></ProtectedRoute>} />
            <Route path="/app/activities" element={<ProtectedRoute><OnboardingGate><ActivitiesPage /></OnboardingGate></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><OnboardingGate><SettingsPage /></OnboardingGate></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
