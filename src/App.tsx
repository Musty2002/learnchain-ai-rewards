import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import AIMentor from "./pages/AIMentor";
import Wallet from "./pages/Wallet";
import SubmitProject from "./pages/SubmitProject";
import Quiz from "./pages/Quiz";
const MeshNetwork = lazy(() => import("./pages/MeshNetwork"));
const MathSolver = lazy(() => import("./pages/MathSolver"));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <React.Fragment>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />
            <Route path="/ai-mentor/:courseId" element={<AIMentor />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/submit-project/:projectId" element={<SubmitProject />} />
            <Route path="/quiz/:quizId" element={<Quiz />} />
            <Route path="/mesh-network" element={<MeshNetwork />} />
            <Route path="/math-solver" element={<MathSolver />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </React.Fragment>
  </QueryClientProvider>
);

export default App;
