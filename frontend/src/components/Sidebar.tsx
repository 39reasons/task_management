import { useQuery, useMutation } from "@apollo/client";
import { GET_PROJECTS, ADD_PROJECT, DELETE_PROJECT, UPDATE_PROJECT } from "../graphql";
import { useState, useEffect, useCallback } from "react";
import {
  PlusCircle,
  Settings,
  X,
  Loader2,
  Globe2,
  Lock,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "@shared/types";

interface SidebarProps {
  user: AuthUser | null;
}

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 600;

export default function Sidebar({ user }: SidebarProps) {
  const { data, loading, refetch } = useQuery(GET_PROJECTS);
  const [addProject] = useMutation(ADD_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });
  const [deleteProject] = useMutation(DELETE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });
  const [updateProject] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });

  const navigate = useNavigate();
  const location = useLocation();

  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsProject, setSettingsProject] = useState<
    | {
        id: string;
        name: string;
        description?: string | null;
        is_public: boolean;
      }
    | null
  >(null);
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsPublic, setSettingsPublic] = useState(false);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const openCreateModal = useCallback(() => {
    setCreateError(null);
    setShowModal(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    if (isCreatingProject) return;
    setShowModal(false);
    setCreateError(null);
  }, [isCreatingProject]);

  useEffect(() => {
    refetch();
  }, [user, refetch]);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCreateModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, isCreatingProject, closeCreateModal]);

  if (loading) return <div className="p-6 text-sm text-slate-300">Loading projects…</div>;

  const projects = (data?.projects ?? []) as Array<{
    id: string;
    name: string;
    description?: string | null;
    is_public: boolean;
    viewer_is_owner: boolean;
  }>;
  const projectCount = projects.length;

  const openProjectSettings = (project: {
    id: string;
    name: string;
    description?: string | null;
    is_public: boolean;
  }) => {
    setSettingsProject(project);
    setSettingsName((project.name ?? "").slice(0, NAME_MAX_LENGTH));
    setSettingsDescription((project.description ?? "").slice(0, DESCRIPTION_MAX_LENGTH));
    setSettingsPublic(Boolean(project.is_public));
    setSettingsError(null);
    setDeleteError(null);
    setDeleteConfirmation("");
    setShowDangerZone(false);
    setShowSettingsModal(true);
  };

  const closeProjectSettings = () => {
    if (settingsSubmitting || deleteSubmitting) return;
    setShowSettingsModal(false);
    setSettingsProject(null);
    setSettingsError(null);
    setSettingsName("");
    setSettingsDescription("");
    setSettingsPublic(false);
    setDeleteSubmitting(false);
    setDeleteConfirmation("");
    setDeleteError(null);
    setShowDangerZone(false);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsProject) return;
    const trimmedName = settingsName.trim();
    if (!trimmedName) {
      setSettingsError("Project name is required.");
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setSettingsError(`Project name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }

    const normalizedDescription = settingsDescription.trim();
    if (normalizedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setSettingsError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setSettingsSubmitting(true);
    setSettingsError(null);
    let didSucceed = false;
    try {
      await updateProject({
        variables: {
          id: settingsProject.id,
          name: trimmedName,
          description: normalizedDescription ? normalizedDescription : null,
          is_public: settingsPublic,
        },
      });
      didSucceed = true;
    } catch (error) {
      setSettingsError((error as Error).message ?? "Unable to update project.");
    } finally {
      setSettingsSubmitting(false);
      if (didSucceed) {
        closeProjectSettings();
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!settingsProject) return;
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm deletion.');
      return;
    }

    setDeleteSubmitting(true);
    setDeleteError(null);
    let didDelete = false;
    try {
      await deleteProject({ variables: { id: settingsProject.id } });
      if (location.pathname === `/projects/${settingsProject.id}`) {
        navigate("/");
      }
      didDelete = true;
    } catch (error) {
      setDeleteError((error as Error).message ?? "Unable to delete project.");
    } finally {
      setDeleteSubmitting(false);
      if (didDelete) {
        closeProjectSettings();
      }
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || isCreatingProject) return;

    setIsCreatingProject(true);
    setCreateError(null);

    try {
      const result = await addProject({
        variables: {
          name: newProjectName,
          description: newProjectDesc || null,
          is_public: isPublic,
        },
      });
      const newProjectId = result.data?.addProject?.id;

      setNewProjectName("");
      setNewProjectDesc("");
      setIsPublic(false);
      setShowModal(false);

      if (newProjectId) navigate(`/projects/${newProjectId}`);
    } catch (error) {
      setCreateError((error as Error).message ?? "Unable to create project.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <aside className="w-72 flex-shrink-0 flex-col gap-6 border-r border-white/10 bg-gradient-to-b from-slate-900/85 via-slate-800/75 to-slate-900/85 px-5 py-6 text-slate-100 shadow-[0_25px_60px_-40px_rgba(59,130,246,0.45)]">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.35em] text-blue-200/70">Workspace</p>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Projects</h2>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {projectCount}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {projectCount
              ? "Boards you can jump into right now."
              : user
                ? "Create a project to start building your workspace."
                : "Sign in to see projects and collaborate."}
          </p>
        </div>

        {user ? (
          <button
            onClick={openCreateModal}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-400/50 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/70 hover:bg-blue-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <PlusCircle className="h-4 w-4 transition group-hover:scale-110" />
            <span>New Project</span>
          </button>
        ) : ""}
      </div>

      <div className="mt-2 flex-1 overflow-y-auto pr-1 styled-scrollbars">
        <ul className="space-y-3 pb-2">
          {projects.map((project) => (
            <li key={project.id}>
              <NavLink
                to={`/projects/${project.id}`}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition-all duration-150 ${
                    isActive
                      ? "border-blue-400/60 bg-blue-500/20 text-white shadow-[0_20px_40px_-30px_rgba(56,189,248,0.75)]"
                      : "border-white/10 bg-white/0 text-slate-300 hover:border-blue-400/60 hover:bg-blue-500/10 hover:text-white"
                  }`
                }
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white" title={project.name}>
                    {project.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        project.is_public
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-700 bg-slate-800/80 text-slate-300"
                      }`}
                    >
                      {project.is_public ? "Public" : "Private"}
                    </span>
                    {project.viewer_is_owner ? (
                      <span className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-100">
                        Owner
                      </span>
                    ) : null}
                  </div>
                  {project.description?.trim() ? (
                    <p className="mt-2 truncate text-xs text-slate-400">
                      {project.description}
                    </p>
                  ) : null}
                </div>

                {user && project.viewer_is_owner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openProjectSettings(project);
                    }}
                    aria-label={`Open settings for ${project.name}`}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-white">
                      <Settings size={16} />
                    </span>
                  </button>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeCreateModal}
            role="presentation"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-slate-100 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-blue-200/70">Project</p>
                <h3 className="text-2xl font-semibold leading-tight text-white">Create Project</h3>
                <p className="text-sm text-slate-400">
                  Spin up a workspace board with optional description and visibility.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-white disabled:opacity-60"
                disabled={isCreatingProject}
                aria-label="Close create project modal"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-project-name" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Project name
                </label>
                <input
                  id="new-project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Growth marketing roadmap"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreatingProject}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-project-desc" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Description (optional)
                </label>
                <textarea
                  id="new-project-desc"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Who is this for? What outcome are you targeting?"
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreatingProject}
                />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-500 focus:ring-blue-400 disabled:cursor-not-allowed"
                  disabled={isCreatingProject}
                />
                Make project public
              </label>
              {createError ? (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                  {createError}
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-300 hover:text-white disabled:opacity-60"
                  disabled={isCreatingProject}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim() || isCreatingProject}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-400/50 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/70 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingProject ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Settings Modal */}
      {showSettingsModal && settingsProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeProjectSettings}
            role="presentation"
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-gray-950/95 text-white shadow-2xl ring-1 ring-gray-800">
            <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-r from-blue-600/15 to-transparent px-6 py-5">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-blue-300">Project</p>
                <h3 className="text-2xl font-semibold leading-tight">Project Settings</h3>
                <p className="text-sm text-gray-300/90">
                  Adjust the project details, visibility, or remove it permanently.
                </p>
              </div>
              <button
                type="button"
                onClick={closeProjectSettings}
                disabled={settingsSubmitting || deleteSubmitting}
                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Close project settings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <form onSubmit={handleUpdateProject} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300" htmlFor="project-settings-name">
                    Project name
                  </label>
                  <input
                    id="project-settings-name"
                    type="text"
                    value={settingsName}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, NAME_MAX_LENGTH);
                      setSettingsName(next);
                      if (settingsError) setSettingsError(null);
                    }}
                    maxLength={NAME_MAX_LENGTH}
                    disabled={settingsSubmitting || deleteSubmitting}
                    className="w-full rounded-2xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-sm text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Acme Growth"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Name must be 1 to {NAME_MAX_LENGTH} characters.</span>
                    <span>
                      {settingsName.length}/{NAME_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300" htmlFor="project-settings-description">
                    Description
                  </label>
                  <textarea
                    id="project-settings-description"
                    value={settingsDescription}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, DESCRIPTION_MAX_LENGTH);
                      setSettingsDescription(next);
                      if (settingsError) setSettingsError(null);
                    }}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    disabled={settingsSubmitting || deleteSubmitting}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-sm text-white shadow-inner placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="What makes this project special?"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Markdown is not supported in this field.</span>
                    <span>
                      {settingsDescription.length}/{DESCRIPTION_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-200">Visibility</p>
                      <p className="text-xs text-gray-400">
                        {settingsPublic
                          ? "Anyone with access to the workspace can see this project."
                          : "Only invited members can view this project."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsPublic(!settingsPublic);
                        if (settingsError) setSettingsError(null);
                      }}
                      disabled={settingsSubmitting || deleteSubmitting}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/30 ${
                        settingsPublic
                          ? "bg-blue-600/90 text-white hover:bg-blue-500"
                          : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                      }`}
                    >
                      {settingsPublic ? <Globe2 size={16} /> : <Lock size={16} />}
                      {settingsPublic ? "Public" : "Private"}
                    </button>
                  </div>
                </div>

                {settingsError && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {settingsError}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeProjectSettings}
                    disabled={settingsSubmitting || deleteSubmitting}
                    className="inline-flex items-center justify-center rounded-full border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      settingsSubmitting ||
                      deleteSubmitting ||
                      !settingsName.trim()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {settingsSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>
              </form>

              <div className="space-y-3 rounded-2xl border border-red-600/30 bg-red-600/10 p-5">
                <button
                  type="button"
                  onClick={() => setShowDangerZone((expanded) => !expanded)}
                  className="flex w-full items-center justify-between rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
                >
                  <span className="inline-flex flex-col gap-1">
                    <span className="inline-flex items-center gap-2">
                      <ShieldAlert size={16} />
                      Delete project
                    </span>
                    <span className="text-xs font-normal text-red-200/90">
                      Permanently removes this project and its data.
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showDangerZone ? "rotate-180" : "rotate-0"}`}
                  />
                </button>

                {showDangerZone && (
                  <div className="space-y-3 rounded-xl border border-red-500/40 bg-gray-950/80 p-4">
                    <div className="space-y-2">
                      <p className="text-xs text-red-200/80 break-words">
                        This action permanently removes <span className="font-semibold">{settingsProject.name}</span> and all of its tasks.
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-100">Type DELETE to continue.</p>
                      <label className="sr-only" htmlFor="delete-confirmation">
                        Type DELETE to confirm project deletion
                      </label>
                      <input
                        id="delete-confirmation"
                        type="text"
                        value={deleteConfirmation}
                        onChange={(e) => {
                          setDeleteConfirmation(e.target.value);
                          if (deleteError) setDeleteError(null);
                        }}
                        disabled={settingsSubmitting || deleteSubmitting}
                        className="w-full rounded-xl border border-red-500/40 bg-gray-900/80 px-4 py-2 text-sm text-red-100 placeholder-red-200/40 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/30"
                        placeholder="DELETE"
                      />
                    </div>

                    {deleteError && (
                      <p className="text-xs text-red-200/90 break-words">{deleteError}</p>
                    )}

                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      disabled={
                        settingsSubmitting ||
                        deleteSubmitting ||
                        deleteConfirmation.trim().toUpperCase() !== "DELETE"
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
                    >
                      {deleteSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting
                        </>
                      ) : (
                        "Delete project"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
