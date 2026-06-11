import { useEffect, useState } from "react";
import { X, ChevronRight } from "lucide-react";

const KEY = "nutrio:onboarded";

const SLIDES = [
  { emoji: "👋", title: "Welcome to Nutrio", body: "Track Indian and global foods, water and goals — all in one place." },
  { emoji: "🍽️", title: "Log meals in seconds", body: "Search, snap a photo, scan a barcode, or just say what you ate." },
  { emoji: "🔥", title: "Your calorie ring", body: "See remaining calories and macros at a glance, every day." },
  { emoji: "💧", title: "Stay hydrated", body: "Tap the water tile to add a glass and hit your daily hydration goal." },
  { emoji: "📈", title: "Goals & trends", body: "Auto-calculate goals from your profile and watch weekly progress." },
];

export function Walkthrough() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  const finish = () => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, "1");
    setOpen(false);
  };
  const s = SLIDES[idx];
  const last = idx === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5" style={{ backgroundColor: "rgba(23,30,25,0.6)" }}>
      <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <button onClick={finish} aria-label="Skip" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full sage-border">
          <X size={16} />
        </button>
        <div className="mx-auto mb-4 mt-2 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl" style={{ backgroundColor: "rgba(202,0,19,0.08)" }}>
          {s.emoji}
        </div>
        <h2 className="text-2xl font-black text-charcoal">{s.title}</h2>
        <p className="mt-2 px-1 text-sm font-bold" style={{ color: "#7a9990" }}>{s.body}</p>

        <div className="my-5 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === idx ? 22 : 8, backgroundColor: i === idx ? "#ca0013" : "rgba(183,198,194,0.5)" }} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={finish} className="flex-1 rounded-full bg-cream py-3 text-sm font-extrabold text-charcoal sage-border-soft">
            Skip
          </button>
          <button
            onClick={() => (last ? finish() : setIdx(idx + 1))}
            className="flex flex-1 items-center justify-center gap-1 rounded-full py-3 text-sm font-extrabold text-white"
            style={{ backgroundColor: "#ca0013" }}
          >
            {last ? "Get started" : "Next"}
            {!last && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
