import { useState } from 'react'
import { useUIStore } from '@/stores'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Label,
    Input,
    Textarea,
} from '@/components/ui'

export function CreateBoardModal() {
    const { activeModal, closeModal } = useUIStore()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    const handleSubmit = () => {
        // Mock submission
        console.log('Create Board:', { name, description })
        closeModal()
        setName('')
        setDescription('')
    }

    return (
        <Dialog open={activeModal === 'createBoard'} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Board</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Board Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Sprint 24"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="What is this board for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeModal}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Board</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
