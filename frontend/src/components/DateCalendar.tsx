import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "./ui";
import { cn } from "../lib/utils";

interface DateCalendarProps {
  selectedDate?: string | null;
  onSelect: (value: string) => void;
  onClose?: () => void;
  title?: string;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DateCalendar({ selectedDate, onSelect, onClose, title = "Dates" }: DateCalendarProps) {
  const parsedSelected = useMemo(() => parseDate(selectedDate), [selectedDate]);
  const selectedValue = parsedSelected ? formatDate(parsedSelected) : null;
  const [viewDate, setViewDate] = useState(() => {
    const base = parsedSelected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!parsedSelected) return;
    setViewDate(new Date(parsedSelected.getFullYear(), parsedSelected.getMonth(), 1));
  }, [parsedSelected]);

  const goToMonth = useCallback((offset: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const days = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startDay = start.getDay();
    const firstVisible = new Date(start);
    firstVisible.setDate(start.getDate() - startDay);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstVisible);
      date.setDate(firstVisible.getDate() + index);
      return date;
    });
  }, [viewDate]);

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  const today = formatDate(new Date());

  return (
    <div className="w-full rounded-xl border border-border bg-card text-card-foreground shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Calendar size={16} className="text-primary" />
          <span>{title}</span>
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close calendar">
            <X size={16} />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between px-4 pb-3 pt-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goToMonth(-12)}
            aria-label="Previous year"
        className="h-8 w-8 border-border text-muted-foreground"
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
        className="h-8 w-8 border-border text-muted-foreground"
          >
            <ChevronLeft size={16} />
          </Button>
        </div>
        <div className="text-sm font-semibold text-foreground">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
        className="h-8 w-8 border-border text-muted-foreground"
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goToMonth(12)}
            aria-label="Next year"
        className="h-8 w-8 border-border text-muted-foreground"
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-1 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pb-4 pt-2 text-sm">
        {days.map((date) => {
          const dateValue = formatDate(date);
          const isCurrentMonth = date.getMonth() === viewDate.getMonth();
          const isSelected = selectedValue === dateValue;
          const isToday = today === dateValue;

          return (
            <Button
              key={dateValue}
              type="button"
              variant="ghost"
              onClick={() => onSelect(dateValue)}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition",
                isSelected
                  ? "bg-primary text-primary-foreground shadow"
                  : isToday
                  ? "border border-primary/50 text-primary"
                  : "text-muted-foreground",
                !isCurrentMonth && "text-muted-foreground/60",
                "hover:bg-primary/20 hover:text-primary"
              )}
            >
              <span>{date.getDate()}</span>
              {isSelected ? (
                <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary-foreground" />
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
