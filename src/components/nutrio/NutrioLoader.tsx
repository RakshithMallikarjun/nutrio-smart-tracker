import { useEffect, useState } from "react";

const MESSAGES = [
  "Loading your data…",
  "Crunching calories…",
  "Stirring the curry pot…",
  "Counting macros…",
  "Almost there…",
];

export function NutrioLoader({ label }: { label?: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ backgroundColor: "#ca0013" }} />
        <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ backgroundColor: "#ca0013", color: "#fff" }}>
          🥑
        </span>
      </div>
      <p key={idx} className="animate-fade-in text-sm font-extrabold text-charcoal">
        {label ?? MESSAGES[idx]}
      </p>
    </div>
  );
}
