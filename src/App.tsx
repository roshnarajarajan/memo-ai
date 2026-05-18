import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import VoiceAssistant from "./components/VoiceAssistant";
import Index from "./pages/Index";
import People from "./pages/People";
import Routine from "./pages/Routine";
import Memories from "./pages/Memories";
import Caregiver from "./pages/Caregiver";
import FaceRecognition from "./pages/FaceRecognition";
import ObjectDetection from "./pages/ObjectDetection";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/people" element={<People />} />
            <Route path="/routine" element={<Routine />} />
            <Route path="/memories" element={<Memories />} />
            <Route path="/caregiver" element={<Caregiver />} />
            <Route path="/face" element={<FaceRecognition />} />  
            <Route path="/objects" element={<ObjectDetection />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
        <VoiceAssistant />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
