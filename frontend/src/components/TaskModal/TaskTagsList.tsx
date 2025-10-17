import { type FormEvent, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
} from "../ui";
import { COLOR_WHEEL } from "../../constants/colors";
import { cn } from "../../lib/utils";

interface TaskTagsListProps {
  tags: { id: string; name: string; color: string | null }[];
  availableTags: { id: string; name: string; color: string | null }[];
  loadingAvailableTags: boolean;
  onRemoveTag: (id: string) => void;
  onAddTag: (id: string) => void;
  onCreateTag: (input: { name: string; color: string }) => Promise<void>;
}

export function TaskTagsList({
  tags,
  availableTags,
  loadingAvailableTags,
  onRemoveTag,
  onAddTag,
  onCreateTag,
}: TaskTagsListProps) {
  const remainingOptions = availableTags.filter(
    (tag) => !tags.some((assigned) => assigned.id === tag.id)
  );
  const defaultTagColor = COLOR_WHEEL[8] ?? COLOR_WHEEL[0] ?? "#2563eb";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(defaultTagColor);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const resetCreateDialogForm = () => {
    setNewTagName("");
    setNewTagColor(defaultTagColor);
    setCreateError(null);
  };

  const openCreateDialog = () => {
    resetCreateDialogForm();
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    resetCreateDialogForm();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isCreatingTag) return;
      closeCreateDialog();
    } else {
      setIsCreateDialogOpen(true);
    }
  };

  const handleCreateTagSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newTagName.trim();
    const selectedColor = newTagColor?.trim() || defaultTagColor;

    if (!trimmedName) {
      setCreateError("Tag name is required");
      return;
    }

    setCreateError(null);
    setIsCreatingTag(true);

    try {
      await onCreateTag({ name: trimmedName, color: selectedColor });
      closeCreateDialog();
    } catch (error) {
      setCreateError((error as Error).message ?? "Unable to create tag");
    } finally {
      setIsCreatingTag(false);
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
            style={{ backgroundColor: tag.color ?? undefined }}
          >
            <span>{tag.name}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onRemoveTag(tag.id)}
              className="h-5 w-5 rounded-full border border-white/30 bg-[hsl(var(--card))] text-primary-foreground hover:border-primary/40 hover:bg-primary/10"
              aria-label={`Remove ${tag.name}`}
            >
              <X size={12} strokeWidth={2} />
            </Button>
          </div>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              aria-label="Add tag"
            >
              <Plus size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {loadingAvailableTags ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Loading tags…</div>
            ) : (
              <>
                {remainingOptions.length > 0 ? (
                  remainingOptions.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onSelect={(event) => {
                        event.preventDefault();
                        onAddTag(tag.id);
                      }}
                    >
                      {tag.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No additional tags</div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setTimeout(() => {
                      openCreateDialog();
                    }, 0);
                  }}
                >
                  Create new tag…
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-sm space-y-4">
          <DialogHeader>
            <DialogTitle>Create tag</DialogTitle>
            <DialogDescription>
              Pick a name and a color so teammates can quickly recognize this tag.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTagSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-modal-new-tag-name">Name</Label>
              <Input
                id="task-modal-new-tag-name"
                autoFocus
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="Marketing"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Color</span>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_WHEEL.map((option) => {
                  const isSelected = option === newTagColor;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setNewTagColor(option)}
                      className={cn(
                        "h-9 w-9 rounded-md border border-border/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                          : "hover:border-border"
                      )}
                      style={{ backgroundColor: option }}
                      aria-pressed={isSelected}
                    />
                  );
                })}
              </div>
            </div>

            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeCreateDialog} disabled={isCreatingTag}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingTag} className="gap-2">
                {isCreatingTag ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create tag"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
