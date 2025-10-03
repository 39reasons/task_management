import type { AuthUser, Task } from "@shared/types";

interface HomePageProps {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}

export function HomePage({ user: _user, setSelectedTask: _setSelectedTask }: HomePageProps) {
  return null;
}
