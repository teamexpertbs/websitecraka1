import { Link } from "wouter";
import { LogIn, User } from "lucide-react";
import { useUserStore } from "@/lib/user-store";

interface Props {
  compact?: boolean;
}

export function UserAvatar({ compact = false }: Props) {
  const { signedInUser } = useUserStore();

  if (!signedInUser) {
    return (
      <Link href="/login">
        <div
          className={`inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer ${
            compact ? "px-2 py-1" : "px-3 py-1.5"
          }`}
        >
          <LogIn className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} text-primary`} />
          {!compact && <span className="text-xs font-medium text-primary">Sign In</span>}
        </div>
      </Link>
    );
  }

  const initials = signedInUser.name
    ? signedInUser.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <Link href="/login">
      <div
        className={`inline-flex items-center gap-2 rounded-lg border border-border hover:border-primary/30 bg-card hover:bg-muted transition-all cursor-pointer ${
          compact ? "px-1.5 py-1" : "px-2.5 py-1.5"
        }`}
        title={signedInUser.email ?? signedInUser.name}
      >
        {signedInUser.avatarUrl ? (
          <img
            src={signedInUser.avatarUrl}
            alt={signedInUser.name}
            className={`${compact ? "w-5 h-5" : "w-6 h-6"} rounded-full object-cover border border-border`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className={`${
              compact ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]"
            } rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold border border-primary/30`}
          >
            {initials}
          </div>
        )}
        {!compact && (
          <span className="text-xs font-medium text-foreground max-w-[90px] truncate">
            {signedInUser.name?.split(" ")[0] ?? "User"}
          </span>
        )}
      </div>
    </Link>
  );
}
