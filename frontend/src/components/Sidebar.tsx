import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { NavLink } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import type { AuthUser } from "@shared/types";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Switch,
  Textarea,
} from "./ui";
import { cn } from "../lib/utils";
import { getNavItemHighlightClasses } from "../lib/navigation";
import { GET_PROJECTS, ADD_PROJECT } from "../graphql";

interface SidebarProps {
  user: AuthUser | null;
}

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 600;

export default function Sidebar({ user }: SidebarProps) {
  const { data, loading } = useQuery(GET_PROJECTS, {
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });

  const projects = useMemo(() => {
    const list = (data?.projects ?? []) as Array<{
      id: string;
      name: string;
      description?: string | null;
      is_public: boolean;
      viewer_is_owner: boolean;
    }>;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.projects]);

  if (loading && projects.length === 0) {
    return (
      <aside className="hidden w-72 flex-none border-r border-border bg-[hsl(var(--sidebar-background))] md:flex">
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Loading projects…
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-72 flex-none border-r border-border bg-[hsl(var(--sidebar-background))] md:flex md:flex-col">
      <SidebarContent user={user} projects={projects} />
    </aside>
  );
}

interface SidebarContentProps {
  user: AuthUser | null;
  projects: Array<{
    id: string;
    name: string;
    description?: string | null;
    is_public: boolean;
    viewer_is_owner: boolean;
  }>;
}

function SidebarContent({ user, projects }: SidebarContentProps) {
  const [addProject] = useMutation(ADD_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPublic, setCreatePublic] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError("Project name is required.");
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setCreateError(`Project name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }
    if (createDescription.trim().length > DESCRIPTION_MAX_LENGTH) {
      setCreateError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await addProject({
        variables: {
          name: trimmedName,
          description: createDescription.trim() || null,
          is_public: createPublic,
        },
      });
      setShowCreate(false);
      setCreateName("");
      setCreateDescription("");
      setCreatePublic(false);
    } catch (error) {
      setCreateError((error as Error).message ?? "Unable to create project.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
          <p className="text-sm text-muted-foreground/80">{projects.length} total</p>
        </div>
        {user ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-1">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </Button>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-2">
          {projects.map((project) => (
            <nav
              key={project.id}
              className="group rounded-lg border border-border bg-card transition hover:border-blue-500/10 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-primary"
            >
              <NavLink
                to={`/projects/${project.id}`}
                className={({ isActive }) =>
                  getNavItemHighlightClasses({
                    isActive,
                    className: "flex flex-col gap-2 rounded-lg border border-transparent px-3 py-3 text-sm transition",
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold text-foreground transition group-hover:text-slate-900 dark:group-hover:text-primary">
                    {project.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "uppercase tracking-wide text-xs transition group-hover:border-slate-400 group-hover:text-slate-700 dark:group-hover:border-white/30 dark:group-hover:text-primary/80",
                      project.is_public
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                        : "border border-border text-muted-foreground"
                    )}
                  >
                    {project.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
              </NavLink>
            </nav>
          ))}

          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-6 text-center text-xs text-muted-foreground">
              {user ? "Create your first project to get started." : "Sign in to view your projects."}
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open && !createSubmitting) {
            setShowCreate(false);
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg space-y-6">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Give your project a clear name and optional description so teammates know what it covers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Project name</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value.slice(0, NAME_MAX_LENGTH))}
                maxLength={NAME_MAX_LENGTH}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {createName.length}/{NAME_MAX_LENGTH}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description (optional)</Label>
              <Textarea
                id="create-description"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                maxLength={DESCRIPTION_MAX_LENGTH}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                {createDescription.length}/{DESCRIPTION_MAX_LENGTH}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Public project</p>
                <p className="text-xs text-muted-foreground">Anyone with the link can view this project.</p>
              </div>
              <Switch checked={createPublic} onCheckedChange={setCreatePublic} />
            </div>
            {createError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={createSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={createSubmitting}>
              {createSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
