import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ScrollToTop from "./components/ScrollToTop";
import ChatBot from "./components/ChatBot";
import WhatsAppButton from "./components/WhatsAppButton";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import Stay from "./pages/Stay";
import SurfStay from "./pages/SurfStay";
import Workation from "./pages/Workation";
import LongStay from "./pages/LongStay";
import VarkalaGuide from "./pages/VarkalaGuide";
import BestTimeToVisit from "./pages/BestTimeToVisit";
import HowToReach from "./pages/HowToReach";
import Contact from "./pages/Contact";
import EvidenceImage from "./pages/EvidenceImage";
import { lazy, Suspense } from "react";

const OpsApp = lazy(() => import("./ops/OpsApp"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/stay" element={<Stay />} />
            <Route path="/surf-stay" element={<SurfStay />} />
            <Route path="/workation" element={<Workation />} />
            <Route path="/long-stay" element={<LongStay />} />
            <Route path="/varkala-guide" element={<VarkalaGuide />} />
            <Route path="/best-time-to-visit-varkala" element={<BestTimeToVisit />} />
            <Route path="/how-to-reach-varkala" element={<HowToReach />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/ops/*" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
                <OpsApp />
              </Suspense>
            } />
            <Route path="/:filename" element={<EvidenceImage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WhatsAppButton />
          <ChatBot />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
