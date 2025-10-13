import { useParams } from "react-router-dom";
import type { AuthUser } from "@shared/types";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

export function ProjectWorkItemsPage({ user }: { user: AuthUser | null }) {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (!user) {
    return (
      <Alert className="mt-4">
        <AlertTitle>Sign in required</AlertTitle>
        <AlertDescription>Sign in to see the tasks that are assigned to you.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Work items</h1>
        <p className="text-sm text-muted-foreground">
          A personalized view of tasks assigned to you for this project. We&apos;ll expand this section with filters and
          task status soon.
        </p>
      </div>
      <Alert>
        <AlertTitle>Coming soon</AlertTitle>
        <AlertDescription>
          Work items will let you triage and update the tasks assigned to you across all project workflows. Sit tight!
        </AlertDescription>
      </Alert>
    </div>
  );
}
