import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { Card } from "@/components/ui/Ui";

const AuthPage = lazy(() => import("@/pages/AuthPage").then(m => ({ default: m.AuthPage })));
const HomePage = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })));
const FeedPage = lazy(() => import("@/pages/FeedPage").then(m => ({ default: m.FeedPage })));
const PostDetailPage = lazy(() => import("@/pages/PostDetailPage").then(m => ({ default: m.PostDetailPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const MessagesPage = lazy(() => import("@/pages/MessagesPage").then(m => ({ default: m.MessagesPage })));
const JobsPage = lazy(() => import("@/pages/JobsPage").then(m => ({ default: m.JobsPage })));
const ResourcesPage = lazy(() => import("@/pages/ResourcesPage").then(m => ({ default: m.ResourcesPage })));
const LostFoundPage = lazy(() => import("@/pages/LostFoundPage").then(m => ({ default: m.LostFoundPage })));
const ConfessionsPage = lazy(() => import("@/pages/ConfessionsPage").then(m => ({ default: m.ConfessionsPage })));
const CatCornerPage = lazy(() => import("@/pages/CatCornerPage").then(m => ({ default: m.CatCornerPage })));
const EventsPage = lazy(() => import("@/pages/EventsPage").then(m => ({ default: m.EventsPage })));
const AboutPage = lazy(() => import("@/pages/AboutPage").then(m => ({ default: m.AboutPage })));
const ModerationPage = lazy(() => import("@/pages/ModerationPage").then(m => ({ default: m.ModerationPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

function Protected({ children }: { children: ReactNode }) { const auth = useAuth(); const location = useLocation(); if (auth.loading) return <Loading />; if (!auth.session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />; return children; }
function RoleProtected({ children }: { children: ReactNode }) { const { user } = useAuth(); return user?.role === "admin" || user?.role === "mod" ? children : <Navigate to="/" replace />; }
function Loading() { return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><Card padded>Loading IUTverse…</Card></main>; }

export default function App() { return <Suspense fallback={<Loading />}><Routes>
  <Route path="/login" element={<AuthPage mode="login" />} />
  <Route path="/signup" element={<AuthPage mode="signup" />} />
  <Route element={<Protected><AppShell /></Protected>}>
    <Route index element={<HomePage />} />
    <Route path="community" element={<FeedPage scope="community" />} />
    <Route path="posts/:postId" element={<PostDetailPage />} />
    <Route path="profile" element={<ProfilePage />} />
    <Route path="profile/:userId" element={<ProfilePage />} />
    <Route path="messages" element={<MessagesPage />} />
    <Route path="chat" element={<Navigate to="/messages" replace />} />
    <Route path="jobs" element={<JobsPage />} />
    <Route path="opportunities" element={<Navigate to="/jobs" replace />} />
    <Route path="academic" element={<ResourcesPage />} />
    <Route path="lost-and-found" element={<LostFoundPage />} />
    <Route path="lostandfound" element={<Navigate to="/lost-and-found" replace />} />
    <Route path="confessions" element={<ConfessionsPage />} />
    <Route path="cat-corner" element={<CatCornerPage />} />
    <Route path="catcorner" element={<Navigate to="/cat-corner" replace />} />
    <Route path="events" element={<EventsPage />} />
    <Route path="eventhub" element={<Navigate to="/events" replace />} />
    <Route path="about" element={<AboutPage />} />
    <Route path="admin/moderation" element={<RoleProtected><ModerationPage /></RoleProtected>} />
  </Route>
  <Route path="*" element={<NotFoundPage />} />
</Routes></Suspense>; }
