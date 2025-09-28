import { useQuery, useMutation } from "@apollo/client";
import { GET_PROJECTS, ADD_PROJECT } from "../graphql/projects";
import { useState } from "react";
import { PlusCircle } from "lucide-react";

interface SidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}

export default function Sidebar({ selectedProjectId, onSelectProject }: SidebarProps) {
  const { data, loading } = useQuery(GET_PROJECTS);
  const [addProject] = useMutation(ADD_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });

  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  if (loading) return <div className="p-4 text-gray-400">Loading...</div>;

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await addProject({
      variables: { name: newProjectName, description: newProjectDesc || null },
    });
    setNewProjectName("");
    setNewProjectDesc("");
    setShowModal(false);
  };

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-4">Projects</h2>

      {/* Project list */}
      <ul className="space-y-2">
        <li
          className={`cursor-pointer p-2 rounded ${
            selectedProjectId === null ? "bg-gray-700" : "hover:bg-gray-700"
          }`}
          onClick={() => onSelectProject(null)}
        >
          All Tasks
        </li>
        {data.projects.map((project: { id: string; name: string }) => (
          <li
            key={project.id}
            className={`cursor-pointer p-2 rounded ${
              selectedProjectId === project.id ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
            onClick={() => onSelectProject(project.id)}
          >
            {project.name}
          </li>
        ))}
      </ul>

      {/* New Project Button directly below the list */}
      <button
        onClick={() => setShowModal(true)}
        className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
      >
        <PlusCircle className="w-4 h-4" />
        New Project
      </button>

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
