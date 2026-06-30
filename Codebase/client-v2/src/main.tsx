import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/app/App";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Ui";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import "@/styles/global.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: (count, error: any) => error?.status === 401 || error?.status === 403 ? false : count < 2, refetchOnWindowFocus: false }, mutations: { retry: false } } });

createRoot(document.getElementById("root")!).render(<StrictMode><ThemeProvider><QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></BrowserRouter></QueryClientProvider></ThemeProvider></StrictMode>);
