"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Ui";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error: any) => (error?.status === 401 || error?.status === 403 ? false : count < 2),
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session; created in state so server renders never share one.
  const [queryClient] = useState(createQueryClient);
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
