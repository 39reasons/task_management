import { useEffect, useRef } from "react";
import { AlignLeft, Sparkles, Loader2 } from "lucide-react";

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
  const hasContent = Boolean(trimmedInitial);
  const shouldShowToggle = trimmedInitial.length > 200 || trimmedInitial.split(/\n/).length > 4;

  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isDraftPromptVisible) {
      const id = window.setTimeout(() => {
        promptRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isDraftPromptVisible]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <AlignLeft className="h-4 w-4 text-gray-400" />
          <span>Description</span>
        </div>
        <button
          type="button"
          onClick={onToggleDraftPrompt}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-100 transition hover:border-blue-400 hover:bg-blue-500/20"
        >
          <Sparkles size={14} className="text-blue-200" />
          {isDraftPromptVisible ? "Close AI draft" : "Draft with AI"}
        </button>
      </div>

      {isDraftPromptVisible ? (
        <div className="space-y-3 rounded-xl border border-blue-500/40 bg-blue-500/10 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-100">Describe the task</p>
            <p className="text-xs text-blue-200/80">
              Share goals, constraints, or expected outcomes. The assistant will draft a title,
              description, and suggested tags.
            </p>
          </div>
          <textarea
            ref={promptRef}
            id="ai-draft-prompt"
            value={draftPrompt}
            onChange={(event) => onDraftPromptChange(event.target.value)}
            className="min-h-[100px] w-full rounded-lg border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-sm text-blue-50 placeholder-blue-200/60 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            placeholder="e.g. Plan the QA checklist for the upcoming mobile release"
          />
          {draftError ? <p className="text-sm text-red-300">{draftError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGenerateDraft}
              disabled={isGeneratingDraft}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate draft
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancelDraftPrompt}
              className="rounded-lg px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/20"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={description}
            autoFocus
            onChange={(event) => onChange(event.target.value)}
            placeholder="Add a more detailed description..."
            className="min-h-[140px] w-full resize-vertical rounded-xl border border-gray-600 bg-gray-900/80 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              disabled={trimmedCurrent === trimmedInitial}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
            >
              Cancel
            </button>
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
          <div className="rounded-xl border border-gray-600 bg-gray-900/60 px-4 py-3 text-sm text-gray-200 transition group-hover:border-blue-500 group-hover:text-blue-200">
            <div className={`whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-5"}`}>
              {initialDescription}
            </div>
            {shouldShowToggle ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpand();
                }}
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:text-blue-200"
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onStartEdit(true)}
          className="w-full rounded-xl border border-dashed border-gray-600 px-4 py-6 text-sm text-left text-gray-400 hover:border-blue-500 hover:text-blue-300"
        >
          Add a more detailed description...
        </button>
      )}
    </div>
  );
}
