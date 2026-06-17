import { Home, BookOpen, Plus, BarChart3, User } from "lucide-react";

type Tab = "home" | "diary" | "trends" | "profile";

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
  onAdd: () => void;
};

export function BottomNav({ active, onChange, onAdd }: Props) {
  const item = (key: Tab, Icon: typeof Home, label: string) => {
    const isActive = active === key;
    return (
      <button
        key={key}
        onClick={() => onChange(key)}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1"
        aria-label={label}
      >
        <Icon size={20} style={{ color: isActive ? "#ffffff" : "#6b6b6b" }} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold" style={{ color: isActive ? "#ffffff" : "#6b6b6b" }}>{label}</span>
      </button>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3">
      <div
        className="pointer-events-auto relative flex h-16 w-full max-w-md items-center rounded-2xl px-2"
        style={{ backgroundColor: "#1a1a1a" }}
      >
        {item("home", Home, "Home")}
        {item("diary", BookOpen, "Diary")}

        <div className="flex w-16 shrink-0 items-center justify-center">
          <button
            onClick={onAdd}
            aria-label="Add food"
            className="flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              backgroundColor: "#e03030",
              boxShadow: "0 10px 24px -8px rgba(224,48,48,0.55)",
            }}
          >
            <Plus size={26} color="#ffffff" strokeWidth={3} />
          </button>
        </div>

        {item("trends", BarChart3, "Reports")}
        {item("profile", User, "Profile")}
      </div>
    </div>
  );
}

export type { Tab };
