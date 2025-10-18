import { useCallback, useState } from "react";
import { FolderOpen, Sparkles } from "lucide-react";
import { useMutation, useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import type { AuthUser, Project, Task } from "@shared/types";
import { ADD_PROJECT, GET_PROJECTS } from "../graphql";
import { NAME_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from "../hooks/useProjectSettingsDialog";
import { ProjectCard } from "../components/home/ProjectCard";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "../components/ui";

interface HomePageProps {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}

export function HomePage({ user }: HomePageProps) {
  void user;
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<{ projects: Project[] }>(GET_PROJECTS, {
    skip: !user,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });
  const [addProjectMutation] = useMutation(ADD_PROJECT);

  const projects = data?.projects ?? [];
  const noProjects = Boolean(user && !loading && projects.length === 0);

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectName, setCreateProjectName] = useState("");
  const [createProjectDescription, setCreateProjectDescription] = useState("");
  const [createProjectIsPublic, setCreateProjectIsPublic] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [createProjectSubmitting, setCreateProjectSubmitting] = useState(false);

  const resetProjectForm = useCallback(() => {
    setCreateProjectName("");
    setCreateProjectDescription("");
    setCreateProjectIsPublic(false);
    setCreateProjectError(null);
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!user) {
      setCreateProjectError("Sign in to create a project.");
      return;
    }

    const trimmedName = createProjectName.trim();
    const trimmedDescription = createProjectDescription.trim();

    if (!trimmedName) {
      setCreateProjectError("Project name is required.");
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setCreateProjectError(`Project name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }

    if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setCreateProjectError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setCreateProjectSubmitting(true);
    setCreateProjectError(null);

    try {
      const response = await addProjectMutation({
        variables: {
          name: trimmedName,
          description: trimmedDescription || null,
          is_public: createProjectIsPublic,
        },
      });

      await refetch();

      const createdId = response.data?.addProject?.id ?? null;
      setIsCreateProjectOpen(false);
      resetProjectForm();
      if (createdId) {
        navigate(`/projects/${createdId}`);
      }
    } catch (mutationError) {
      setCreateProjectError((mutationError as Error).message ?? "Unable to create project.");
    } finally {
      setCreateProjectSubmitting(false);
    }
  }, [
    addProjectMutation,
    createProjectDescription,
    createProjectIsPublic,
    createProjectName,
    navigate,
    refetch,
    resetProjectForm,
    user,
  ]);

  const handleOpenProject = useCallback(
    (projectId: string) => {
      if (!projectId) return;
      navigate(`/projects/${projectId}`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6 pb-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load projects</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Alert>
          <AlertTitle>Loading projects…</AlertTitle>
          <AlertDescription>We’re gathering your workspace projects. Hang tight!</AlertDescription>
        </Alert>
      ) : null}

      {user && noProjects ? (
        <div className="space-y-2">
          <Alert>
            <AlertTitle>No projects yet</AlertTitle>
            <AlertDescription>Create your first project to organize teams and workflows.</AlertDescription>
          </Alert>
          <div className="rounded-2xl border border-dashed border-border bg-muted/70 px-6 py-8 text-center text-sm text-muted-foreground">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
              <FolderOpen className="h-6 w-6" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Ready to spin up a project?</p>
            <div className="mt-4">
              <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
                Create project
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && projects.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your projects</h2>
            <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(true)}>
              New project
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpenProject={handleOpenProject} />
            ))}
          </div>
        </section>
      ) : null}

      <Dialog
        open={isCreateProjectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateProjectOpen(false);
            resetProjectForm();
          } else {
            setIsCreateProjectOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new project</DialogTitle>
            <DialogDescription>Projects bundle teams, workflows, and workstreams in one place.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="home-project-name">Project name</Label>
              <Input
                id="home-project-name"
                value={createProjectName}
                onChange={(event) => setCreateProjectName(event.target.value)}
                placeholder="e.g. Mobile app launch"
                disabled={createProjectSubmitting}
                maxLength={NAME_MAX_LENGTH}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-project-description">Description</Label>
              <Textarea
                id="home-project-description"
                value={createProjectDescription}
                onChange={(event) => setCreateProjectDescription(event.target.value)}
                placeholder="Share the focus for this project"
                disabled={createProjectSubmitting}
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/30 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Make project public</p>
                <p className="text-xs text-muted-foreground">Public projects are discoverable to everyone in your workspace.</p>
              </div>
              <Switch
                id="home-project-public"
                checked={createProjectIsPublic}
                onCheckedChange={(checked) => setCreateProjectIsPublic(Boolean(checked))}
                disabled={createProjectSubmitting}
              />
            </div>
            {createProjectError ? <p className="text-sm text-destructive">{createProjectError}</p> : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateProjectOpen(false);
                resetProjectForm();
              }}
              disabled={createProjectSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateProject()}
              disabled={createProjectSubmitting}
              className="gap-2"
            >
              {createProjectSubmitting ? <Sparkles className="h-4 w-4 animate-spin" /> : null}
              {createProjectSubmitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
