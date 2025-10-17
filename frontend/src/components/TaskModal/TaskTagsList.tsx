import { Plus, X } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui";

interface TaskTagsListProps {
  tags: { id: string; name: string; color: string | null }[];
  availableTags: { id: string; name: string; color: string | null }[];
  loadingAvailableTags: boolean;
  onRemoveTag: (id: string) => void;
  onAddTag: (id: string) => void;
  onCreateTag: (name: string) => Promise<void>;
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
                  onSelect={(event) => {
                    event.preventDefault();
                    const name = window.prompt("Create new tag", "");
                    if (name) {
                      void onCreateTag(name);
                    }
                  }}
                >
                  Create new tag…
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
