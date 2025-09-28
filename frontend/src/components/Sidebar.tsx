import { useQuery, gql } from "@apollo/client";

const GET_PROJECTS = gql`
  query {
    projects {
      id
      name
    }
  }
`;

interface SidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}

export default function Sidebar({ selectedProjectId, onSelectProject }: SidebarProps) {
  const { data, loading } = useQuery(GET_PROJECTS);

  if (loading) return <div className="p-4 text-gray-400">Loading...</div>;

  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-lg font-bold mb-4">Projects</h2>
      <ul className="space-y-2">
        {/* Show all tasks */}
        <li
          className={`cursor-pointer p-2 rounded ${
            selectedProjectId === null ? "bg-gray-700" : "hover:bg-gray-700"
          }`}
          onClick={() => onSelectProject(null)}
        >
          All Tasks
        </li>

        {/* List projects */}
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
    </aside>
  );
}
