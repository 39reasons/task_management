import { useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

export function ProjectSprintsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Sprints</h1>
        <p className="text-sm text-muted-foreground">
          Plan iterations, review active sprints, and monitor progress as work moves through your workflow.
        </p>
      </div>
      <Alert>
        <AlertTitle>Sprint management is in progress</AlertTitle>
        <AlertDescription>
          Soon you&apos;ll be able to create sprints, manage capacity, and review burndown metrics here.
        </AlertDescription>
      </Alert>
    </div>
  );
}
