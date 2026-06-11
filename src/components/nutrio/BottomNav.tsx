import { Home, TrendingUp, Plus, Droplet, User } from "lucide-react";

type Tab = "home" | "trends" | "water" | "profile";

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
        className="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
        aria-label={label}
      >
        <Icon size={22} style={{ color: isActive ? "#ffffff" : "#b7c6c2" }} strokeWidth={isActive ? 2.5 : 2} />
      </button>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-40 flex justify-center px-2">
      <div
        className="pointer-events-auto relative flex h-16 w-full max-w-md items-center justify-between rounded-full px-4"
        style={{ backgroundColor: "#171e19" }}
      >
        <div className="flex flex-1 justify-around">
          {item("home", Home, "Home")}
          {item("trends", TrendingUp, "Trends")}
        </div>

        {/* Floating FAB */}
        <button
          onClick={onAdd}
          aria-label="Add food"
          className="absolute left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{
            top: -28,
            backgroundColor: "#ca0013",
            border: "4px solid #eeebe3",
            boxShadow: "0 12px 30px -8px rgba(202,0,19,0.45)",
          }}
        >
          <Plus size={26} color="#ffffff" strokeWidth={3} />
        </button>

        <div className="flex flex-1 justify-around">
          {item("water", Droplet, "Water")}
          {item("profile", User, "Profile")}
        </div>
      </div>
    </div>
  );
}

export type { Tab };
