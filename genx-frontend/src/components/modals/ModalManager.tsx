import { CreateTaskModal } from './CreateTaskModal'
import { CreateTaskTemplateModal } from './CreateTaskTemplateModal'
import { CreateBoardModal } from './CreateBoardModal'
import { CreateProjectModal } from './CreateProjectModal'
import { ProjectSettingsModal } from './ProjectSettingsModal'
import { InviteMemberModal } from './InviteMemberModal'
import { DueDateRequestModal } from './DueDateRequestModal'
import { useUIStore } from '@/stores'

export function ModalManager() {
    const { activeModal } = useUIStore()

    if (!activeModal) return null

    return (
        <>
            <CreateTaskModal />
            <CreateTaskTemplateModal />
            <CreateBoardModal />
            <CreateProjectModal />
            <ProjectSettingsModal />
            <InviteMemberModal />
            <DueDateRequestModal />
        </>
    )
}
