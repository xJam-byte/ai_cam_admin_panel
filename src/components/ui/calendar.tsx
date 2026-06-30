"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-2 relative items-center w-full px-6",
        caption_label: "text-sm font-semibold text-slate-800",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-slate-100 rounded-lg transition-colors",
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse",
        head_row: "flex justify-between mt-2 px-1",
        head_cell:
          "text-slate-400 rounded-md w-9 font-medium text-[0.75rem] text-center",
        row: "flex w-full mt-1.5 justify-between px-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-100/70 [&:has([aria-selected].day-range-end)]:rounded-r-xl [&:has([aria-selected].day-range-start)]:rounded-l-xl first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-xl [&:has(>.day-range-start)]:rounded-l-xl"
            : "[&:has([aria-selected])]:rounded-xl",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-all aria-selected:opacity-100",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-indigo-600 aria-selected:text-white aria-selected:rounded-xl shadow-md shadow-indigo-600/10",
        day_range_end:
          "day-range-end aria-selected:bg-indigo-600 aria-selected:text-white aria-selected:rounded-xl shadow-md shadow-indigo-600/10",
        day_selected:
          "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white focus:bg-indigo-600 focus:text-white",
        day_today: "bg-slate-100 text-slate-900 border border-slate-200/50 font-bold",
        day_outside:
          "day-outside text-slate-300 opacity-50 aria-selected:text-slate-400",
        day_disabled: "text-slate-300 opacity-50 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-indigo-50 aria-selected:text-indigo-900 aria-selected:rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
