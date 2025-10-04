import { useQuery, useMutation } from "@apollo/client";
import { GET_PROJECTS, ADD_PROJECT, DELETE_PROJECT, UPDATE_PROJECT } from "../graphql";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    refetch();
  }, [user, refetch]);

  if (loading) return <div className="p-4 text-gray-400">Loading...</div>;

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
    if (deleteConfirmation.trim() !== settingsProject.name) {
      setDeleteError("Type the project name to confirm deletion.");
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
    if (!newProjectName.trim()) return;
    const result = await addProject({
      variables: {
        name: newProjectName,
        description: newProjectDesc || null,
        is_public: isPublic,
      },
    });
    setNewProjectName("");
    setNewProjectDesc("");
    setIsPublic(false);
    setShowModal(false);

    const newProjectId = result.data?.addProject?.id;
    if (newProjectId) navigate(`/projects/${newProjectId}`);
  };

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-4">Projects</h2>

      {/* Project list */}
      <ul className="space-y-2">
        {/* User projects */}
        {data?.projects?.map(
          (project: {
            id: string;
            name: string;
            description?: string | null;
            is_public: boolean;
            viewer_is_owner: boolean;
          }) => (
            <li key={project.id}>
              <NavLink
                to={`/projects/${project.id}`}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg border-l-4 p-2 transition-colors ${
                    isActive
                      ? "border-blue-500 bg-gray-700 text-white shadow"
                      : "border-transparent text-gray-200 hover:border-blue-400 hover:bg-gray-700 hover:text-white"
                  } cursor-default`
                }
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{project.name}</span>
                  {project.is_public && (
                    <span className="text-xs text-green-400">Public</span>
                  )}
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
                    className="opacity-0 group-hover:opacity-100 text-gray-400 transition hover:text-blue-300"
                  >
                    <Settings size={16} />
                  </button>
                )}
              </NavLink>
            </li>
          )
        )}
      </ul>

      {/* New Project Button (only if logged in) */}
      {user && (
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Project
        </button>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Create Project</h3>
            <form onSubmit={handleAddProject} className="space-y-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg px-3 py-2 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-lg px-3 py-2 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                Make project public
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
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
                      <label className="text-xs font-medium text-red-200" htmlFor="delete-confirmation">
                        Type <span className="font-semibold">{settingsProject.name}</span> to confirm
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
                        placeholder={settingsProject.name}
                      />
                    </div>

                    {deleteError && (
                      <p className="text-xs text-red-200/90">{deleteError}</p>
                    )}

                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      disabled={
                        settingsSubmitting ||
                        deleteSubmitting ||
                        deleteConfirmation.trim() !== settingsProject.name
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
