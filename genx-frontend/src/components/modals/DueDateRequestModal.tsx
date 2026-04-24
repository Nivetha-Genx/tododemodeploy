import { useUIStore } from '@/stores'
import { tasksApi } from '@/api/tasks'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Label,
    Textarea,
    DatePicker
} from '@/components/ui'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

// Helper to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Helper to get today's date at midnight
const getTodayDate = (): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

export function DueDateRequestModal() {
    const { activeModal, closeModal, modalData } = useUIStore()
    const [newDate, setNewDate] = useState('')
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const isOpen = activeModal === 'dueDateRequest'

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!newDate || !reason || !modalData?.taskId) return

        if (reason.trim().length < 10) {
            setError('The reason field must be at least 10 characters.')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await tasksApi.submitDueDateRequest(modalData.taskId as string, {
                proposed_due_date: newDate,
                reason: reason
            })
            window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: modalData.taskId } }));
            toast({
                title: 'Request Submitted',
                description: response.message || 'Due date change request has been submitted successfully.',
            })
            closeModal()
            setNewDate('')
            setReason('')
            setError('')
        } catch (error: any) {
            console.error('Failed to submit due date request:', error)
            const errorMessage = error?.response?.data?.message || 'Failed to submit due date request.'
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Request Due Date Change</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-date">New Due Date</Label>
                        <DatePicker
                            date={newDate ? new Date(newDate) : undefined}
                            setDate={(date) => setNewDate(date ? formatLocalDate(date) : '')}
                            placeholder="Select new due date"
                            minDate={(() => {
                                const today = getTodayDate()
                                if (modalData?.startDate) {
                                    const startDate = new Date(modalData.startDate + 'T00:00:00')
                                    startDate.setHours(0, 0, 0, 0)
                                    if (startDate > today) {
                                        return startDate
                                    }
                                }
                                return today
                            })()}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Change</Label>
                        <Textarea
                            id="reason"
                            placeholder="Why do you need more time?"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value)
                                if (error) setError('')
                            }}
                            required
                            className={error ? 'min-h-[100px] border-red-700' : 'min-h-[100px]'}
                        />
                        <div className="flex justify-end">
                            <p className="text-[10px] text-muted-foreground italic">
                                Must contain at least 10 characters
                            </p>
                        </div>
                        {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !newDate || !reason}>
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
