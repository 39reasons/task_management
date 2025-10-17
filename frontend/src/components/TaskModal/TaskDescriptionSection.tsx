import { useEffect, useRef } from "react";
import { AlignLeft, Sparkles, Loader2 } from "lucide-react";
import { Button, Textarea } from "../ui";
import { cn } from "../../lib/utils";

interface TaskDescriptionSectionProps {
  description: string;
  initialDescription: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  onStartEdit: (reset?: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  isDraftPromptVisible: boolean;
  draftPrompt: string;
  draftError: string | null;
  isGeneratingDraft: boolean;
  onToggleDraftPrompt: () => void;
  onDraftPromptChange: (value: string) => void;
  onGenerateDraft: () => void;
  onCancelDraftPrompt: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function TaskDescriptionSection({
  description,
  initialDescription,
  isEditing,
  onChange,
  onStartEdit,
  onSave,
  onCancel,
  isDraftPromptVisible,
  draftPrompt,
  draftError,
  isGeneratingDraft,
  onToggleDraftPrompt,
  onDraftPromptChange,
  onGenerateDraft,
  onCancelDraftPrompt,
  isExpanded,
  onToggleExpand,
}: TaskDescriptionSectionProps) {
  const trimmedCurrent = description.trim();
  const trimmedInitial = initialDescription.trim();
  const hasContent = Boolean(trimmedCurrent);
  const shouldShowToggle = trimmedCurrent.length > 200 || trimmedCurrent.split(/\n/).length > 4;

  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isDraftPromptVisible) {
      const id = window.setTimeout(() => {
        promptRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isDraftPromptVisible]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      const textarea = editorRef.current;
      const maxHeight = Math.min(window.innerHeight * 0.5, 440);
      textarea.style.height = "auto";
      const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [description, isEditing]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlignLeft className="h-4 w-4 text-muted-foreground" />
          <span>Description</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onToggleDraftPrompt}
          aria-pressed={isDraftPromptVisible}
          className={cn(
            "gap-2 border-primary/20 bg-transparent text-xs font-semibold uppercase tracking-wide text-primary transition hover:border-primary/60 hover:bg-transparent",
            isDraftPromptVisible &&
              "border-primary text-primary shadow-[0_0_0_1px_rgba(37,99,235,0.25)] hover:bg-transparent"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isDraftPromptVisible ? "Close AI draft" : "Draft with AI"}
        </Button>
      </div>

      {isDraftPromptVisible ? (
        <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">Describe the task</p>
            <p className="text-xs text-primary/80">
              Share goals, constraints, or expected outcomes. The assistant will draft a title,
              description, and suggested tags.
            </p>
          </div>
          <Textarea
            ref={promptRef}
            id="ai-draft-prompt"
            value={draftPrompt}
            onChange={(event) => onDraftPromptChange(event.target.value)}
            className="min-h-[120px] border-primary/40 bg-background text-sm text-foreground placeholder:text-primary/60"
            placeholder="e.g. Plan the QA checklist for the upcoming mobile release"
          />
          {draftError ? <p className="text-sm text-destructive">{draftError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onGenerateDraft} disabled={isGeneratingDraft} className="gap-2">
              {isGeneratingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate draft
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancelDraftPrompt}
              className="border border-border/70 text-muted-foreground hover:border-border hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={description}
            autoFocus
            ref={editorRef}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Add a more detailed description..."
            className="min-h-[140px] resize-y overflow-auto border-border bg-[hsl(var(--card))] text-foreground focus-visible:border-primary focus-visible:ring-primary/30"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={onSave} disabled={trimmedCurrent === trimmedInitial}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="border border-border/70 text-muted-foreground hover:border-border hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : hasContent ? (
        <div
          className="group w-full text-left"
          role="button"
          tabIndex={0}
          onClick={() => onStartEdit(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onStartEdit(false);
            }
          }}
        >
          <div className="rounded-lg border border-border bg-[hsl(var(--card))] px-4 py-3 transition group-hover:border-primary/40 group-hover:bg-muted/40">
            <div
              className={cn(
                "whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground",
                !isExpanded && "line-clamp-5"
              )}
            >
              {description}
            </div>
            {shouldShowToggle ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpand();
                }}
                className="mt-3 h-auto px-0 text-xs font-semibold uppercase tracking-wide text-primary hover:text-primary/80"
              >
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => onStartEdit(true)}
          className="w-full justify-start border-dashed border-border/60 px-4 py-6 text-left text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          Add a more detailed description…
        </Button>
      )}
    </div>
  );
}
