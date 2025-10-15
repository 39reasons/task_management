import { Plus, X } from "lucide-react";

import { Button } from "../ui";

interface TaskTagsListProps {
  tags: { id: string; name: string; color: string | null }[];
  onRemoveTag: (id: string) => void;
  onAddTag: () => void;
}

export function TaskTagsList({ tags, onRemoveTag, onAddTag }: TaskTagsListProps) {
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
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onAddTag}
          className="h-6 w-6 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
          aria-label="Add tag"
        >
          <Plus size={12} />
        </Button>
      </div>
    </div>
  );
}
