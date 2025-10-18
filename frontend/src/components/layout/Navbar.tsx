import { Link } from "react-router-dom";
import { Bell, LogOut, Settings } from "lucide-react";
import type { AuthUser } from "@shared/types";
import { useModal } from "../ModalStack";
import { useNotifications } from "../../hooks/useNotifications";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import breadLogo from "../../assets/menacing_bread.png";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui";

interface NavbarProps {
  user: AuthUser | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const { openModal } = useModal();
  const { notifications } = useNotifications(Boolean(user), user?.id ?? null);
  const unreadCount = notifications.filter((notification) => !notification.is_read && notification.status === "pending").length;

  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <img
            src={breadLogo}
            alt="Task Manager logo"
            className="h-10 w-10 rounded-full bg-muted object-cover shadow-sm"
          />
          <span className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
            TBD
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      onClick={() => openModal("notifications")}
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 ? (
                        <Badge
                          variant="destructive"
                          className="absolute -right-1.5 -top-1 h-4 min-w-[1.3rem] justify-center px-1 text-[10px]"
                        >
                          {Math.min(unreadCount, 99)}
                        </Badge>
                      ) : null}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 rounded-full px-2.5 py-1.5 hover:bg-accent focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <Avatar className="h-9 w-9 border border-border/80 shadow-inner">
                      <AvatarFallback
                        className="text-sm font-semibold uppercase text-primary-foreground"
                        style={{ backgroundColor: user.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                      >
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden flex-col items-start text-left text-xs font-medium leading-tight sm:flex">
                      <span className="text-foreground">{getFullName(user)}</span>
                      <span className="text-muted-foreground">@{user.username}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="w-56 border border-border p-1.5 shadow-xl"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                    backdropFilter: "none",
                    WebkitBackdropFilter: "none",
                  }}
                >
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-xs font-normal text-muted-foreground">Signed in as</span>
                    <span className="text-sm font-semibold text-foreground">{getFullName(user)}</span>
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/80 dark:bg-white/40" />
                  <DropdownMenuItem
                    asChild
                    className="group cursor-pointer rounded-md border border-transparent text-foreground transition hover:border-blue-500/10 hover:bg-blue-500/10 dark:hover:border-white/20 dark:hover:bg-white/10"
                  >
                    <Link
                      to="/settings"
                      className="flex w-full items-center gap-2 text-sm transition group-hover:text-blue-600 dark:group-hover:text-primary"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="group cursor-pointer rounded-md border border-transparent text-destructive transition hover:border-blue-500/10 hover:bg-blue-500/10 dark:hover:border-white/20 dark:hover:bg-white/10"
                    onSelect={(event) => {
                      event.preventDefault();
                      onLogout();
                    }}
                  >
                    <span className="flex w-full items-center gap-2 text-sm transition group-hover:text-blue-600 dark:group-hover:text-primary">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
