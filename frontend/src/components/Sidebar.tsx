import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { NavLink, useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AuthUser } from "@shared/types";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Separator,
  Switch,
  Textarea,
} from "./ui";
import { cn } from "../lib/utils";
import { getNavItemHighlightClasses } from "../lib/navigation";
import { GET_PROJECTS, ADD_PROJECT, REORDER_PROJECTS } from "../graphql";

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
      position?: number | null;
    }>;
    return list
      .slice()
      .sort((a, b) => {
        const posA = a.position ?? Number.MAX_SAFE_INTEGER;
        const posB = b.position ?? Number.MAX_SAFE_INTEGER;
        if (posA !== posB) {
          return posA - posB;
        }
        return a.name.localeCompare(b.name);
      });
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
    position?: number | null;
  }>;
}

function SidebarContent({ user, projects }: SidebarContentProps) {
  const [addProject] = useMutation(ADD_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });
  const [reorderProjectsMutation] = useMutation(REORDER_PROJECTS, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPublic, setCreatePublic] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [orderedProjects, setOrderedProjects] = useState(projects);
  const [blockNavigation, setBlockNavigation] = useState(false);
  const unblockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    setOrderedProjects((previous) => {
      const projectMap = new Map(projects.map((project) => [project.id, project]));
      const next: SidebarContentProps["projects"] = [];

      for (const existing of previous) {
        const updated = projectMap.get(existing.id);
        if (updated) {
          next.push(updated);
          projectMap.delete(existing.id);
        }
      }

      projectMap.forEach((project) => {
        next.push(project);
      });

      return next;
    });
  }, [projects]);

  useEffect(() => {
    return () => {
      if (unblockTimeout.current) {
        clearTimeout(unblockTimeout.current);
        unblockTimeout.current = null;
      }
    };
  }, []);

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
      const { data: addProjectData } = await addProject({
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
      const newProject = addProjectData?.addProject;
      if (newProject?.id) {
        navigate(`/projects/${newProject.id}`);
      }
    } catch (error) {
      setCreateError((error as Error).message ?? "Unable to create project.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const persistOrder = useCallback(
    async (
      nextOrder: Array<SidebarContentProps["projects"][number]>,
      previousOrder: Array<SidebarContentProps["projects"][number]>
    ) => {
      if (!user) return;
      try {
        await reorderProjectsMutation({
          variables: { project_ids: nextOrder.map((project) => project.id) },
        });
      } catch (error) {
        console.error("Failed to reorder projects", error);
        setOrderedProjects(previousOrder.slice());
      }
    },
    [reorderProjectsMutation, user]
  );

  const scheduleUnblockNavigation = useCallback(() => {
    if (unblockTimeout.current) {
      clearTimeout(unblockTimeout.current);
    }
    unblockTimeout.current = setTimeout(() => {
      setBlockNavigation(false);
      unblockTimeout.current = null;
    }, 150);
  }, []);

  const handleDragStart = useCallback(() => {
    if (unblockTimeout.current) {
      clearTimeout(unblockTimeout.current);
      unblockTimeout.current = null;
    }
    setBlockNavigation(true);
  }, []);

  const handleReorder = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!user || !over || active.id === over.id) {
        scheduleUnblockNavigation();
        return;
      }

      setOrderedProjects((current) => {
        const oldIndex = current.findIndex((project) => project.id === active.id);
        const newIndex = current.findIndex((project) => project.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
          scheduleUnblockNavigation();
          return current;
        }
        const previousOrder = current.slice();
        const reordered = arrayMove(current, oldIndex, newIndex);
        void persistOrder(reordered, previousOrder);
        scheduleUnblockNavigation();
        return reordered;
      });
    },
    [persistOrder, scheduleUnblockNavigation, user]
  );

  const handleDragCancel = useCallback(() => {
    scheduleUnblockNavigation();
  }, [scheduleUnblockNavigation]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
          <p className="text-sm text-muted-foreground/80">{projects.length} total</p>
        </div>
        {user ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-1 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </Button>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleReorder}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={orderedProjects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedProjects.map((project) => (
                <SortableProjectItem key={project.id} project={project} disableNavigation={blockNavigation} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-6 text-center text-xs text-muted-foreground">
              {user ? "Create your first project to get started." : "Sign in to view your projects."}
            </div>
        ) : null}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Project name</Label>
              <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value.slice(0, NAME_MAX_LENGTH))}
                  maxLength={NAME_MAX_LENGTH}
                  className="border-0 bg-transparent px-0 pr-16 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  {createName.length}/{NAME_MAX_LENGTH}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description (optional)</Label>
              <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <Textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  className="min-h-[120px] border-0 bg-transparent px-0 pr-16 pb-8 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {createDescription.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {createPublic ? "Public project" : "Private project"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {createPublic
                    ? "Anyone with the link can view this project."
                    : "Only invited members can access this project."}
                </p>
              </div>
              <Switch
                checked={createPublic}
                onCheckedChange={setCreatePublic}
              />
            </div>
            {createError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreate(false)}
              disabled={createSubmitting}
              className="border border-transparent transition-colors hover:!bg-neutral-200 hover:!text-foreground dark:border-neutral-700 dark:hover:!bg-neutral-800"
            >
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

function SortableProjectItem({
  project,
  disableNavigation,
}: {
  project: SidebarContentProps["projects"][number];
  disableNavigation: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } = useSortable({
    id: project.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const handleLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (disableNavigation || isDragging || isSorting) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [disableNavigation, isDragging, isSorting]
  );

  return (
    <nav
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border border-border bg-card transition hover:border-blue-500/10 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-primary",
        isDragging && "cursor-grabbing border-primary/40 bg-primary/10 opacity-80 shadow-lg"
      )}
      {...attributes}
      {...listeners}
    >
      <NavLink
        to={`/projects/${project.id}`}
        className={({ isActive }) =>
          getNavItemHighlightClasses({
            isActive,
            className: cn(
              "flex flex-col gap-2 rounded-lg border border-transparent px-3 py-3 text-sm transition",
              disableNavigation && "pointer-events-none"
            ),
          })
        }
        onClick={handleLinkClick}
        tabIndex={disableNavigation ? -1 : 0}
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
  );
}
