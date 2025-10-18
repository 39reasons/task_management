import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface WorkflowGeneratorProps {
  canUseAI: boolean;
  onGenerate: (prompt: string) => Promise<void> | void;
  children: (props: {
    isOpen: boolean;
    isGenerating: boolean;
    toggle: () => void;
    panel: ReactNode;
  }) => ReactNode;
}

export function WorkflowGenerator({ canUseAI, onGenerate, children }: WorkflowGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggle = useCallback(() => {
    if (!canUseAI || isGenerating) return;
    setError(null);
    setIsOpen((previous) => !previous);
  }, [canUseAI, isGenerating]);

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Describe the board experience you'd like to generate.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      await onGenerate(trimmed);
      setIsOpen(false);
      setPrompt("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.replace(/^GraphQL error:\s*/i, "")
          : "Failed to generate board stages.";
      setError(message || "Failed to generate board stages.");
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerate, prompt]);

  const handleCancel = useCallback(() => {
    if (isGenerating) return;
    setIsOpen(false);
    setError(null);
  }, [isGenerating]);

  const panel = useMemo(() => {
    if (!canUseAI || !isOpen) return null;

    return (
      <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-primary shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Describe the board you need</p>
          <p className="text-xs text-primary/80">
            Mention goals, hand-offs, or constraints. We'll suggest stage names in order and add them to your board.
          </p>
        </div>
        <Textarea
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="e.g. A software release pipeline from idea to deployment with QA and launch"
          className="min-h-[120px] bg-[hsl(var(--sidebar-background))] text-primary placeholder:text-primary/60"
          disabled={isGenerating}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleGenerate()} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate stages
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isGenerating}
            className="rounded-md border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-primary hover:border-white/40 hover:bg-white/10 hover:text-primary"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }, [canUseAI, error, handleCancel, handleGenerate, isGenerating, isOpen, prompt]);

  return <>{children({ isOpen, isGenerating, toggle, panel })}</>;
}
