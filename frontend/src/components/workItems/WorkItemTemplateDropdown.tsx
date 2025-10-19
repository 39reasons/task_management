import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { WorkItemType } from "@shared/types";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui";
import { WORK_ITEM_TEMPLATE_OPTIONS } from "../../constants/workItems";
import { getWorkItemIconMeta } from "../../constants/workItemVisuals";

type WorkItemTemplateDropdownProps = {
  projectId: string | null;
  triggerLabel?: string;
  onNavigate?: (type: WorkItemType, slug: string) => void;
};

export function WorkItemTemplateDropdown({
  projectId,
  triggerLabel = "Work item templates",
  onNavigate,
}: WorkItemTemplateDropdownProps) {
  const navigate = useNavigate();
  const isDisabled = !projectId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={isDisabled}
          className="inline-flex w-56 items-center justify-between gap-2 rounded-xl border-border/70 bg-background/80 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed"
        >
          <span>{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select a work item type</DropdownMenuLabel>
        {WORK_ITEM_TEMPLATE_OPTIONS.map((option) => {
          const { icon: Icon, colorClass } = getWorkItemIconMeta(option.type);
          return (
            <DropdownMenuItem
              key={option.type}
              onSelect={(event) => {
                event.preventDefault();
                if (!projectId) return;
                if (onNavigate) {
                  onNavigate(option.type, option.slug);
                  return;
                }
                navigate(`/projects/${projectId}/work-items/templates/${option.slug}`);
              }}
            >
              <span className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${colorClass}`} />
                <span>{option.label}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
