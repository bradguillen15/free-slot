import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { createQueryClient } from "@/lib/queryClient";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingGate } from "@/components/OnboardingGate";
import { AppLayoutOutlet } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import CalendarPage from "./pages/CalendarPage";
import SchedulePage from "./pages/SchedulePage";
import LabelsPage from "./pages/LabelsPage";
import WeekPage from "./pages/WeekPage";
import MonthPage from "./pages/MonthPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = createQueryClient();

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
            {/* Onboarding works for both guests and signed-in users */}
            <Route path="/onboarding" element={<OnboardingGate key="onboarding"><Onboarding /></OnboardingGate>} />
            {/* One AppLayout for all /app/* — child routes fade in/out on navigation */}
            <Route
              path="/app"
              element={
                <OnboardingGate key="app">
                  <AppLayoutOutlet />
                </OnboardingGate>
              }
            >
              <Route index element={<CalendarPage />} />
              <Route path="week" element={<WeekPage />} />
              <Route path="month" element={<MonthPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="labels" element={<LabelsPage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
