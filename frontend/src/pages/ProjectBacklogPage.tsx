import { useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

export function ProjectBacklogPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Backlog</h1>
        <p className="text-sm text-muted-foreground">
          Organize upcoming work, prioritize tasks, and get consensus before they enter a sprint.
        </p>
      </div>
      <Alert>
        <AlertTitle>Backlog planning is on the roadmap</AlertTitle>
        <AlertDescription>
          We&apos;re building out backlog boards so you can group tasks, set priority, and prep for sprint planning from
          here.
        </AlertDescription>
      </Alert>
    </div>
  );
}
