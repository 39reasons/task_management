import { useMemo, useState } from "react";
import { useMutation } from "@apollo/client";
import type { Tag } from "@shared/types";
import { ADD_TAG, UPDATE_TAG } from "../../graphql";
import { COLOR_WHEEL } from "../../constants/colors";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "../ui";
import { cn } from "../../lib/utils";

export type TagEditorState = { mode: "create" } | { mode: "edit"; tag: Tag };

interface TagEditorDialogProps {
  open: boolean;
  state: TagEditorState;
  projectId: string;
  onCancel: () => void;
  onComplete: (tag: Tag) => void;
}

const DEFAULT_COLOR = COLOR_WHEEL[8];

export function TagEditorDialog({
  open,
  state,
  projectId,
  onCancel,
  onComplete,
}: TagEditorDialogProps) {
  const isEdit = state.mode === "edit";
  const referenceTag = isEdit ? state.tag : null;

  const [name, setName] = useState(referenceTag?.name ?? "");
  const [color, setColor] = useState<string>(referenceTag?.color ?? DEFAULT_COLOR);
  const [formError, setFormError] = useState<string | null>(null);

  const palette = useMemo(() => {
    const basePalette = [...COLOR_WHEEL];
    if (referenceTag?.color && !basePalette.includes(referenceTag.color)) {
      return [referenceTag.color, ...basePalette];
    }
    return basePalette;
  }, [referenceTag?.color]);

  const [addTag, { loading: creating }] = useMutation(ADD_TAG);
  const [updateTag, { loading: updating }] = useMutation(UPDATE_TAG);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError("Tag name is required");
      return;
    }

    setFormError(null);

    try {
      if (isEdit && referenceTag) {
        const { data } = await updateTag({
          variables: { id: referenceTag.id, name: trimmedName, color },
        });
        if (data?.updateTag) {
          onComplete(data.updateTag);
        }
      } else {
        const { data } = await addTag({
          variables: { project_id: projectId, name: trimmedName, color },
        });
        if (data?.addTag) {
          onComplete(data.addTag);
        }
      }
    } catch (error) {
      setFormError((error as Error).message ?? "Unable to save tag");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-sm space-y-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit tag" : "Create tag"}</DialogTitle>
          <DialogDescription>
            Set a name and color to help teammates identify this tag quickly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name-input">Name</Label>
            <Input
              id="tag-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Enter tag name"
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Color</span>
            <div className="grid grid-cols-6 gap-2">
              {palette.map((option) => {
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
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || updating}>
              {creating || updating ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
