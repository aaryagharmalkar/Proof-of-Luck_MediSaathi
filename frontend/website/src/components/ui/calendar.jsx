import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { motion } from 'framer-motion'
import { format } from 'date-fns'

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  compact = false,
  ...props
}) {
  const daySize = compact ? 'h-6 w-6 text-xs' : 'h-8 w-8';
  const captionClass = compact ? 'text-xs font-medium' : 'text-sm font-medium';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn(compact ? 'p-2' : 'p-3', className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: captionClass,
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transform hover:scale-110 transition-transform"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7 gap-1",
          head_cell:
            "text-muted-foreground rounded-md w-full text-center py-1 font-normal text-[0.9rem]",
          row: "grid grid-cols-7 mt-2 gap-1",
          cell: cn(
            "relative p-0 text-center text-sm flex items-center justify-center focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
            props.mode === "range"
              ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              : "[&:has([aria-selected])]:rounded-md"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            `${daySize} p-0 font-normal aria-selected:opacity-100 transform transition-transform duration-150 hover:scale-105`
          ),
          day_range_start: "day-range-start",
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md transform scale-105",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Caption: ({ className, displayMonth }) => (
            <div className={cn("flex justify-center pt-1 relative items-center", className)}>
              <motion.h3 key={displayMonth?.toString()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={captionClass}>
                {format(displayMonth || new Date(), 'MMMM yyyy')}
              </motion.h3>
            </div>
          ),
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          ),
        }}
        {...props} />
    </motion.div>
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
