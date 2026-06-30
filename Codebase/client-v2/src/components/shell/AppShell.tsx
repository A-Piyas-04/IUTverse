import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, BriefcaseBusiness, CalendarDays, Cat, CircleUserRound, CloudSun, Feather, Home, Info, LogOut, Menu, MessageSquare, Moon, Plus, Search, ShieldCheck, Sun, UsersRound, MapPin } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/features/theme/ThemeProvider";
import { apiPage, mediaUrl } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { Avatar, Button } from "@/components/ui/Ui";
import { CampusUtilitiesDialog } from "@/pages/CampusUtilities";
import styles from "./Shell.module.css";

const groups = [
  { label: "Main", items: [{ to: "/", text: "Home", icon: Home, end: true }, { to: "/community", text: "Community", icon: UsersRound }] },
  { label: "Learn & Work", items: [{ to: "/academic", text: "Academics", icon: BookOpen }, { to: "/jobs", text: "Jobs", icon: BriefcaseBusiness }] },
  { label: "Account", items: [{ to: "/messages", text: "Messages", icon: MessageSquare }, { to: "/profile", text: "Profile", icon: CircleUserRound }, { to: "/about", text: "About Us", icon: Info }] },
  { label: "Campus", items: [{ to: "/lost-and-found", text: "LostAndFound", icon: MapPin }, { to: "/events", text: "EventHub", icon: CalendarDays }, { to: "/cat-corner", text: "CatCorner", icon: Cat }, { to: "/confessions", text: "Confessions", icon: Feather }] },
];

const navClass = ({ isActive }: { isActive: boolean }) => `${styles.navLink} ${isActive ? styles.navActive : ""}`;

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMessages = location.pathname === "/messages" || location.pathname === "/chat";
  const isAdmin = user?.role === "admin" || user?.role === "mod";
  const openCampusInfo = () => { setOpen(false); setCampusOpen(true); };

  return <div className={styles.shell}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className={styles.topbar}>
      <NavLink className={styles.brand} to="/"><span className={styles.brandMark}>I</span><span>IUTverse</span></NavLink>
      <label className={styles.search}><Search size={18} /><span className="sr-only">Search IUTverse</span><input type="search" placeholder="Search campus content" onKeyDown={event => { if (event.key === "Enter") navigate(`/community?q=${encodeURIComponent(event.currentTarget.value)}`); }} /></label>
      <div className={styles.topActions}>
        <Button className={styles.topTheme} variant="ghost" iconOnly aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} aria-pressed={theme === "dark"} onClick={toggleTheme}>{theme === "light" ? <Moon /> : <Sun />}</Button>
        <Button variant="primary" onClick={() => navigate("/community?compose=1")}><Plus size={18} />Post</Button>
        <Button className={styles.menuButton} variant="secondary" iconOnly aria-label="Open navigation" onClick={() => setOpen(true)}><Menu /></Button>
      </div>
    </header>
    {open && <button className={styles.backdrop} aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className={`${styles.grid} ${isMessages ? styles.gridNoRail : ""}`}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`} aria-label="Primary navigation">
        <nav>{groups.map(group => <div className={styles.navGroup} key={group.label}>
          <div className={styles.navLabel}>{group.label}</div>
          {group.items.map(({ icon: Icon, ...item }) => <NavLink key={item.to} to={item.to} end={item.end} className={navClass} onClick={() => setOpen(false)}><Icon size={21} /><span>{item.text}</span></NavLink>)}
          {group.label === "Campus" && <button type="button" className={styles.navButton} onClick={openCampusInfo}><CloudSun size={21} /><span>Daily campus info</span></button>}
        </div>)}
          {isAdmin && <NavLink to="/admin/moderation" className={navClass}><ShieldCheck size={21} />Moderation</NavLink>}
        </nav>
        <div className={styles.sidebarProfile}><Avatar name={user?.displayName} size={40} /><div><strong>{user?.displayName || "IUT member"}</strong><span>{user?.email}</span></div></div>
        <Button variant="ghost" onClick={() => void signOut()}><LogOut size={17} />Logout</Button>
      </aside>
      <main id="main-content" className={styles.main}><Outlet /></main>
      {!isMessages && <aside className={styles.right} aria-label="Recent messages"><RecentMessagesRail /></aside>}
    </div>
    <nav className={styles.mobileNav} aria-label="Mobile navigation">
      {[{ to: "/", text: "Home", icon: Home }, { to: "/community", text: "Community", icon: UsersRound }, { to: "/academic", text: "Learn", icon: BookOpen }, { to: "/messages", text: "Messages", icon: MessageSquare }, { to: "/profile", text: "Profile", icon: CircleUserRound }].map(({ icon: Icon, ...item }) => <NavLink key={item.to} to={item.to} className={navClass}><Icon size={21} /><span>{item.text}</span></NavLink>)}
    </nav>
    <CampusUtilitiesDialog open={campusOpen} onClose={() => setCampusOpen(false)} />
  </div>;
}

function RecentMessagesRail() {
  const navigate = useNavigate();
  const conversations = useQuery({ queryKey: ["conversations", "recent"], queryFn: ({ signal }) => apiPage<Conversation>("/chat/conversations?limit=4", signal), staleTime: 30_000 });
  const recent = conversations.data?.data.slice(0, 4) ?? [];
  return <section className={styles.rightCard} aria-labelledby="recent-messages-title">
    <div className={styles.railHeading}><div><span>Private conversations</span><h2 id="recent-messages-title">Recent messages</h2></div><MessageSquare size={20} /></div>
    {conversations.isLoading && <p className={styles.railStatus}>Loading recent conversations…</p>}
    {conversations.isError && <div className={styles.railStatus}><p>Recent messages could not load.</p><Button variant="secondary" onClick={() => void conversations.refetch()}>Retry</Button></div>}
    {!conversations.isError && <div className={styles.recentList}>{recent.map(conversation => <button type="button" className={styles.recentPerson} key={conversation.id} onClick={() => navigate(`/messages?conversation=${conversation.id}`)}>
      <Avatar size={42} name={conversation.otherUser?.displayName} src={mediaUrl(conversation.otherUser?.profilePictureUrl)} />
      <span className={styles.recentCopy}><strong>{conversation.otherUser?.displayName || "IUT member"}</strong><small>{conversation.lastMessage || "Start the conversation"}</small></span>
      {Boolean(conversation.unreadCount) && <span className={styles.unread} aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span>}
    </button>)}</div>}
    {!conversations.isLoading && recent.length < 4 && <button type="button" className={styles.startChat} onClick={() => navigate("/messages?new=1")}><Plus size={18} /><span><strong>Start a new chat</strong><small>Find another IUT member</small></span></button>}
  </section>;
}

export function PageFrame({ title, eyebrow, action, tabs, children }: { title: string; eyebrow?: string; action?: ReactNode; tabs?: ReactNode; children: ReactNode }) {
  return <><header style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--border)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div>{eyebrow && <div style={{ color: "var(--campus)", fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em" }}>{eyebrow}</div>}<h1 style={{ margin: "3px 0 0", fontSize: 24 }}>{title}</h1></div>{action}</div>{tabs && <div style={{ display: "flex", gap: 8, marginTop: 16, overflowX: "auto" }}>{tabs}</div>}</header>{children}</>;
}
