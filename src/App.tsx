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
            <Route path="/app/dashboard" element={<ProtectedRoute><OnboardingGate><Placeholder title="Dashboard" body="Stats — coming in Phase 7." /></OnboardingGate></ProtectedRoute>} />
            <Route path="/app/activities" element={<ProtectedRoute><OnboardingGate><Placeholder title="Activities" body="Goal stack & weekly priority — coming next." /></OnboardingGate></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><OnboardingGate><Placeholder title="Settings" body="Preferences & categories — coming next." /></OnboardingGate></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
