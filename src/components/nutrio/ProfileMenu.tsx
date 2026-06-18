import { Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  initial: string;
  onSettings: () => void;
  onSignOut: () => void;
};

export function ProfileMenu({ initial, onSettings, onSignOut }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Profile menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        <DropdownMenuItem onClick={onSettings} className="cursor-pointer gap-2 font-semibold">
          <Settings size={15} /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer gap-2 font-bold text-red-600 focus:text-red-600"
        >
          <LogOut size={15} /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
