import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Label,
    Input,
} from '@/components/ui'
import { sprintsApi } from '@/api/sprints'
import { useToast } from '@/components/ui/use-toast'

function formatDateInput(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

interface CreateSprintModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (sprintId: string) => void
}

export function CreateSprintModal({ open, onOpenChange, onSuccess }: CreateSprintModalProps) {
    const { toast } = useToast()
    const today = new Date()
    const defaultEnd = new Date(today)
    defaultEnd.setDate(defaultEnd.getDate() + 13)
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState(formatDateInput(today))
    const [endDate, setEndDate] = useState(formatDateInput(defaultEnd))
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const reset = () => {
        const t = new Date()
        const end = new Date(t)
        end.setDate(end.getDate() + 13)
        setName('')
        setStartDate(formatDateInput(t))
        setEndDate(formatDateInput(end))
        setError(null)
    }

    const handleOpenChange = (next: boolean) => {
        if (!next) reset()
        onOpenChange(next)
    }

    const handleSubmit = async () => {
        setError(null)
        const trimmed = name.trim()
        if (!trimmed) {
            setError('Sprint name is required.')
            return
        }
        if (!startDate || !endDate) {
            setError('Start and end dates are required.')
            return
        }
        if (new Date(endDate) < new Date(startDate)) {
            setError('End date must be on or after start date.')
            return
        }
        setIsSubmitting(true)
        try {
            const res = await sprintsApi.create({
                name: trimmed,
                start_date: startDate,
                end_date: endDate,
            })
            const created = res?.data?.id ?? res?.data?.data?.id ?? (res?.data as any)?.id

            toast({
                title: 'Success',
                description: res.message || 'Sprint created successfully',
                variant: 'success',
            })

            reset()
            onOpenChange(false)
            if (created && onSuccess) onSuccess(created)
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to create sprint.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create sprint</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="sprint-name">Name</Label>
                        <Input
                            id="sprint-name"
                            placeholder="e.g. Sprint 1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sprint-start">Start date</Label>
                        <Input
                            id="sprint-start"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sprint-end">End date</Label>
                        <Input
                            id="sprint-end"
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                </div>
                <DialogFooter className="flex flex-row justify-end gap-2">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating…' : 'Create sprint'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
