import React, { Suspense } from "react";
import type { Metadata } from "next";
import AppContent from "./AppContent";
import { SidebarProvider } from "./components/navigation/SidebarContext";
import { ToastProvider } from "./components/feedback/ToastContext";
import { UniversityDataProvider } from "./components/data/UniversityDataProvider";
import { AuthGateProvider } from "./components/auth/AuthGate";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-white font-sans overflow-hidden">
        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col w-full">
          <div className="h-16 border-b border-slate-100 bg-white flex items-center px-4 sm:px-8">
            <div className="h-8 w-64 bg-slate-100 rounded-full animate-pulse"></div>
          </div>
          <div className="p-4 sm:p-8 space-y-6">
            <div className="h-40 w-full bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <ToastProvider>
        <SidebarProvider>
          <AuthGateProvider>
            <UniversityDataProvider>
              <AppContent />
            </UniversityDataProvider>
          </AuthGateProvider>
        </SidebarProvider>
      </ToastProvider>
    </Suspense>
  );
}
