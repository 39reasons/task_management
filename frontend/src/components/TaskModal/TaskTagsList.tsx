import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { Ban, Loader2, Plus, SquarePen, X } from "lucide-react";

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

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

interface TaskTagsAddButtonProps {
  tags: TagOption[];
  availableTags: TagOption[];
  loadingAvailableTags: boolean;
  onAddTag: (id: string) => void;
  onCreateTag: (input: { name: string; color: string }) => Promise<void>;
  trigger: ReactElement;
}

const DEFAULT_TAG_COLOR = COLOR_WHEEL[8] ?? COLOR_WHEEL[0] ?? "#2563eb";

export function TaskTagsAddButton({
  tags,
  availableTags,
  loadingAvailableTags,
  onAddTag,
  onCreateTag,
  trigger,
}: TaskTagsAddButtonProps) {
  const remainingOptions = useMemo(
    () => availableTags.filter((tag) => !tags.some((assigned) => assigned.id === tag.id)),
    [availableTags, tags]
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const resetCreateDialogForm = () => {
    setNewTagName("");
    setNewTagColor(DEFAULT_TAG_COLOR);
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
    const selectedColor = newTagColor?.trim() || DEFAULT_TAG_COLOR;

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
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
                onSelect={(event) => {
                  event.preventDefault();
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
                placeholder="Enter tag name"
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
    </>
  );
}

interface TagEditDialogProps {
  tag: TagOption;
  onSubmit: (input: { id: string; name: string; color: string | null }) => Promise<void>;
  isUpdating: boolean;
  buttonClassName?: string;
}

function TagEditDialog({ tag, onSubmit, isUpdating, buttonClassName }: TagEditDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState<string | null>(tag.color ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDialogOpenChange = (open: boolean) => {
    if (isSaving) return;
    if (!open) {
      setIsDialogOpen(false);
      setFormError(null);
      return;
    }
    if (isUpdating) return;
    setName(tag.name);
    setColor(tag.color ?? null);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Tag name is required");
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await onSubmit({
        id: tag.id,
        name: trimmedName,
        color: color ? color.trim() : null,
      });
      setIsDialogOpen(false);
    } catch (error) {
      setFormError((error as Error).message ?? "Unable to update tag");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => {
          if (isUpdating) return;
          setName(tag.name);
          setColor(tag.color ?? null);
          setFormError(null);
          setIsDialogOpen(true);
        }}
        disabled={isUpdating || isSaving}
        className={cn(
          "h-[14px] w-[14px] rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          isUpdating || isSaving ? "cursor-wait" : null,
          buttonClassName
        )}
        aria-label={`Edit ${tag.name}`}
      >
        {isUpdating || isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <SquarePen className="h-3 w-3" />}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-sm space-y-4">
          <DialogHeader>
            <DialogTitle>Edit tag</DialogTitle>
            <DialogDescription>Rename this tag or update its color.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`task-tag-${tag.id}-name`}>Name</Label>
              <Input
                id={`task-tag-${tag.id}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Color</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColor(null)}
                  disabled={color === null}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Ban className="mr-1 h-3 w-3" />
                  Remove color
                </Button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_WHEEL.map((option) => {
                  const isSelected = option === color;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
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

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TaskTagsListProps {
  tags: TagOption[];
  availableTags: TagOption[];
  loadingAvailableTags: boolean;
  onRemoveTag: (id: string) => void;
  onAddTag: (id: string) => void;
  onCreateTag: (input: { name: string; color: string }) => Promise<void>;
  onUpdateTag: (input: { id: string; name: string; color: string | null }) => Promise<void>;
}

export function TaskTagsList({
  tags,
  availableTags,
  loadingAvailableTags,
  onRemoveTag,
  onAddTag,
  onCreateTag,
  onUpdateTag,
}: TaskTagsListProps) {
  const [updatingTagId, setUpdatingTagId] = useState<string | null>(null);

  if (tags.length === 0) {
    return null;
  }

  const handleUpdateTag = async (input: { id: string; name: string; color: string | null }) => {
    setUpdatingTagId(input.id);
    try {
      await onUpdateTag(input);
    } catch (error) {
      console.error("Failed to update tag", error);
      throw error;
    } finally {
      setUpdatingTagId(null);
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => {
          const isUpdatingCurrent = updatingTagId === tag.id;
          return (
            <div key={tag.id} className="group relative flex items-center gap-1.5 pr-2">
              <div
                className="flex min-h-[32px] items-center rounded-full border border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
                style={{ backgroundColor: tag.color ?? undefined }}
              >
                <span className="truncate">{tag.name}</span>
              </div>

            <div
              className={cn(
                "pointer-events-none absolute right-0 top-0 flex -translate-y-1/2 -translate-x-2 items-center gap-[1px] rounded-sm border border-border/60 bg-[hsl(var(--card))] px-[2px] py-0 text-[10px] shadow-sm opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 z-10",
                isUpdatingCurrent ? "opacity-100 pointer-events-auto" : null
              )}
            >
              <TagEditDialog
                tag={tag}
                isUpdating={isUpdatingCurrent}
                onSubmit={(input) => handleUpdateTag(input)}
                buttonClassName="pointer-events-auto"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onRemoveTag(tag.id)}
                className="pointer-events-auto h-[14px] w-[14px] rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                aria-label={`Remove ${tag.name}`}
              >
                <X size={9} strokeWidth={2} />
              </Button>
              </div>
            </div>
          );
        })}
        <TaskTagsAddButton
          tags={tags}
          availableTags={availableTags}
          loadingAvailableTags={loadingAvailableTags}
          onAddTag={onAddTag}
          onCreateTag={onCreateTag}
          trigger={
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              aria-label="Add tag"
            >
              <Plus size={12} />
            </Button>
          }
        />
      </div>
    </div>
  );
}
