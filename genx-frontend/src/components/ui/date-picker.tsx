import * as React from "react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    placeholder?: string
    className?: string
    minDate?: Date
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className, minDate }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal overflow-hidden",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{date ? format(date, "MMM do, yyyy") : placeholder}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[10001]" align="start">
                <ReactDatePicker
                    selected={date}
                    onChange={(selectedDate: Date | null) => {
                        setDate(selectedDate || undefined)
                        setOpen(false)
                    }}
                    minDate={minDate}
                    inline
                />
            </PopoverContent>
        </Popover>
    )
}
