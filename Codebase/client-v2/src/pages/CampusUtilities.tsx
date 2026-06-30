import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Brain, CalendarDays, CloudSun, Landmark, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { academicCalendarUrl, prayerTimes } from "@/content/legacy";
import { Button, Card, Dialog } from "@/components/ui/Ui";
import factsRaw from "../../../client/src/pages/homepage/view/IUTFacts/iutFacts.txt?raw";
import teasersRaw from "../../../client/src/pages/homepage/view/BrainTeaser/BrainTeaser.txt?raw";
import styles from "./Pages.module.css";

type Utility = "menu" | "prayer" | "calendar" | "facts" | "teaser" | "weather";
const cards = [
  { id: "prayer" as const, title: "Prayer Times", body: "IUT Mosque Schedule", icon: Landmark },
  { id: "calendar" as const, title: "IUT Academic Calendar", body: "View the official calendar", icon: CalendarDays },
  { id: "facts" as const, title: "Random IUT Fact", body: "A little campus truth", icon: Sparkles },
  { id: "teaser" as const, title: "Brain Teaser", body: "Give your brain a short break", icon: Brain },
  { id: "weather" as const, title: "Today's Weather", body: "Board Bazar, Gazipur", icon: CloudSun },
];

export function CampusUtilitiesDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const [view, setView] = useState<Utility>("menu");
  const [fact, setFact] = useState(0);
  const [teaser, setTeaser] = useState(0);
  const [answer, setAnswer] = useState(false);
  const facts = useMemo(() => factsRaw.split(/\r?\n/).filter(Boolean).map(line => line.replace(/^\d+\.\s*/, "")), []);
  const teasers = useMemo(() => teasersRaw.split(/\r?\n\r?\n/).map(pair => { const [question, response] = pair.split(/\r?\n/); return { q: question?.replace(/^Q:\s*/, ""), a: response?.replace(/^A:\s*/, "") }; }).filter(item => item.q && item.a), []);
  const weather = useQuery({ queryKey: ["weather"], queryFn: ({ signal }) => apiRequest<any>("/campus/weather", {}, signal), enabled: open && view === "weather", staleTime: 600_000 });
  useEffect(() => { if (!open) { setView("menu"); setAnswer(false); } }, [open]);
  const titles: Record<Utility, string> = { menu: "Daily campus info", prayer: "Daily Prayer Times", calendar: "IUT Academic Calendar", facts: "Random IUT Fact", teaser: "Brain Teaser", weather: "Weather Forecast" };

  return <Dialog title={titles[view]} open={open} onClose={onClose}>
    {view !== "menu" && <Button variant="ghost" onClick={() => setView("menu")}><ArrowLeft size={17} />All campus tools</Button>}
    {view === "menu" && <><p className={styles.meta}>Prayer, academics and a quick campus break—all in one place.</p><div className={styles.utilityGrid}>{cards.map(({ id, title, body, icon: Icon }) => <button className={styles.utility} key={id} onClick={() => setView(id)}><Icon size={28} /><div><strong>{title}</strong><div className={styles.meta}>{body}</div></div></button>)}</div></>}
    {view === "prayer" && <><p>IUT Mosque Schedule</p>{prayerTimes.map(prayer => <Card key={prayer.name} padded><div className={styles.titleRow}><div><strong>{prayer.name}</strong><div className={styles.meta}>{prayer.arabic} · {prayer.description}</div></div><strong>{prayer.time}</strong></div></Card>)}<p className={styles.meta}>Times may vary slightly. Please check with the mosque for exact times.</p></>}
    {view === "calendar" && <div className={styles.notice}><BookOpenCheck /><h3>Academic Calendar</h3><p>Open the official IUT Academic Calendar in a new tab.</p><Button onClick={() => window.open(academicCalendarUrl, "_blank", "noopener,noreferrer")}>Open Academic Calendar</Button></div>}
    {view === "facts" && <><p style={{ fontSize: 20, lineHeight: 1.6 }}>{facts[fact]}</p><Button onClick={() => setFact((fact + 1) % facts.length)}><RefreshCw size={17} />New fact</Button></>}
    {view === "teaser" && <><h3>{teasers[teaser]?.q}</h3>{answer && <div className={styles.notice}>{teasers[teaser]?.a}</div>}<div className={styles.actions}><Button variant="secondary" onClick={() => setAnswer(value => !value)}>{answer ? "Hide answer" : "Reveal answer"}</Button><Button onClick={() => { setTeaser((teaser + 1) % teasers.length); setAnswer(false); }}>New question</Button></div></>}
    {view === "weather" && <>{weather.isLoading && <p>Loading weather data…</p>}{weather.isError && <div className={styles.dangerNotice}><h3>Weather Data Unavailable</h3><p>{weather.error.message}</p><Button onClick={() => void weather.refetch()}>Try again</Button></div>}{weather.data && <div><h2>{weather.data.data.location || "Gazipur, Bangladesh"}</h2><div style={{ fontSize: 54, fontWeight: 800 }}>{Math.round(weather.data.data.temperature)}°C</div><p>{weather.data.data.description}</p><div className={styles.metrics}><span>Feels like {Math.round(weather.data.data.feelsLike)}°</span><span>Humidity {weather.data.data.humidity}%</span><span>Wind {weather.data.data.windSpeed} m/s</span></div></div>}</>}
  </Dialog>;
}
