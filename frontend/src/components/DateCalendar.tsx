import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
  Calendar,
} from "lucide-react";

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
    <div className="w-full max-w-sm rounded-3xl bg-gray-900 text-white shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
          <Calendar size={16} className="text-blue-300" />
          <span>{title}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
            aria-label="Close calendar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToMonth(-12)}
            className="rounded-lg border border-gray-700 p-1 text-gray-300 transition hover:border-gray-500 hover:text-gray-100"
            aria-label="Previous year"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="rounded-lg border border-gray-700 p-1 text-gray-300 transition hover:border-gray-500 hover:text-gray-100"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="text-base font-semibold">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="rounded-lg border border-gray-700 p-1 text-gray-300 transition hover:border-gray-500 hover:text-gray-100"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(12)}
            className="rounded-lg border border-gray-700 p-1 text-gray-300 transition hover:border-gray-500 hover:text-gray-100"
            aria-label="Next year"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
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
            <button
              key={dateValue}
              type="button"
              onClick={() => onSelect(dateValue)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition focus:outline-none
                ${isSelected ? "bg-blue-600 text-white shadow-lg" : ""}
                ${!isSelected && isToday ? "border border-blue-500/60 text-white" : ""}
                ${!isSelected && !isToday ? "text-gray-200" : ""}
                ${!isCurrentMonth ? "text-gray-500" : ""}
                hover:bg-blue-500/40 hover:text-white`}
            >
              <span>{date.getDate()}</span>
              {isSelected && (
                <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
