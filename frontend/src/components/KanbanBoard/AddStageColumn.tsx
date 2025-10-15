import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, CornerDownLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { STAGE_NAME_MAX_LENGTH } from "./utils";

interface AddStageColumnProps {
  onAddStage: (name: string) => void | Promise<void>;
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function AddStageColumn({ onAddStage, scrollContainerRef }: AddStageColumnProps) {
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const addStageContainerRef = useRef<HTMLDivElement | null>(null);
  const addStageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAddingStage) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!addStageContainerRef.current?.contains(event.target as Node)) {
        setIsAddingStage(false);
        setNewStageName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingStage]);

  useEffect(() => {
    if (isAddingStage) {
      addStageInputRef.current?.focus();
    }
  }, [isAddingStage]);

  const scrollToEnd = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      const node = scrollContainerRef.current;
      if (!node) return;
      const maxScroll = node.scrollWidth - node.clientWidth;
      if (maxScroll > 0) {
        node.scrollTo({ left: maxScroll, behavior: "smooth" });
      }
    });
  }, [scrollContainerRef]);

  const submitNewStage = useCallback(async () => {
    const value = newStageName.trim();
    if (!value) return;
    if (value.length > STAGE_NAME_MAX_LENGTH) return;
    await Promise.resolve(onAddStage(value));
    setNewStageName("");
    setIsAddingStage(false);
    scrollToEnd();
  }, [newStageName, onAddStage, scrollToEnd]);

  const handleAddStageSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      await submitNewStage();
    },
    [submitNewStage]
  );

  if (!isAddingStage) {
    return (
      <div className="flex min-w-[280px] flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsAddingStage(true)}
          className="flex w-full items-center justify-start gap-3 rounded-2xl border border-dashed border-border/60 bg-transparent px-5 py-8 text-left transition hover:border-primary/40 hover:bg-muted/20"
        >
          <span className="flex h-5 w-5 items-center justify-center text-primary">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-sm font-semibold text-foreground">Add stage</span>
            <span className="text-xs text-muted-foreground">Create a new column for this workflow</span>
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-[280px] flex-col gap-3">
      <div ref={addStageContainerRef} className="w-full">
        <form
          onPointerDown={(event) => event.stopPropagation()}
          onSubmit={handleAddStageSubmit}
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-muted/30 px-3 py-2 shadow-sm focus-within:border-primary"
        >
          <Input
            ref={addStageInputRef}
            value={newStageName}
            onChange={(event) => setNewStageName(event.target.value.slice(0, STAGE_NAME_MAX_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsAddingStage(false);
                setNewStageName("");
              }
            }}
            placeholder="Add stage title..."
            className="border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            maxLength={STAGE_NAME_MAX_LENGTH}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              if (newStageName.trim()) {
                void submitNewStage();
              }
            }}
            disabled={!newStageName.trim()}
            className={`h-8 w-8 rounded-full text-muted-foreground ${
              newStageName.trim() ? "text-primary hover:bg-primary/10" : ""
            }`}
            aria-label="Add stage"
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
