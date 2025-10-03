import { useQuery, useMutation } from "@apollo/client";
import { GET_PROJECTS, ADD_PROJECT, DELETE_PROJECT } from "../graphql";
import { useState, useEffect } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

interface SidebarProps {
  user: { username: string } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const { data, loading, refetch } = useQuery(GET_PROJECTS);
  const [addProject] = useMutation(ADD_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });
  const [deleteProject] = useMutation(DELETE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });

  const navigate = useNavigate();
  const location = useLocation();

  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    refetch();
  }, [user, refetch]);

  if (loading) return <div className="p-4 text-gray-400">Loading...</div>;

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
          (project: { id: string; name: string; is_public: boolean; viewer_is_owner: boolean }) => (
            <li key={project.id} className="group">
              <div className="flex items-center justify-between rounded p-2 hover:bg-gray-700">
                <NavLink
                  to={`/projects/${project.id}`}
                  className={({ isActive }) =>
                    `flex-1 ${isActive ? "text-white" : "text-gray-200"}`
                  }
                >
                  <span>{project.name}</span>
                  {project.is_public && (
                    <span className="ml-2 text-xs text-green-400">Public</span>
                  )}
                </NavLink>
                {user && project.viewer_is_owner && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await deleteProject({ variables: { id: project.id } });
                      if (location.pathname === `/projects/${project.id}`) {
                        navigate("/");
                      }
                    }}
                    aria-label={`Delete ${project.name}`}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </li>
          )
        )}
      </ul>

      {/* New Project Button (only if logged in) */}
      {user && (
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          New Project
        </button>
      )}

      {/* Modal */}
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
