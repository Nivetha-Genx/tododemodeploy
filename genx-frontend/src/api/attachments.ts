import apiClient from '@/lib/axios'
import { Attachment } from '@/types'

interface BackendAttachment {
    id: string
    task_id: string
    filename: string
    size_bytes: number
    formatted_size: string
    download_url: string
    uploaded_by?: {
        id: string
        name: string
        email: string
        avatar_url?: string
    }
    created_at: string
}

const mapBackendAttachmentToFrontend = (a: BackendAttachment): Attachment => {
    return {
        id: a.id,
        taskId: a.task_id,
        filename: a.filename,
        sizeBytes: a.size_bytes,
        formattedSize: a.formatted_size,
        downloadUrl: a.download_url,
        uploadedBy: a.uploaded_by
            ? {
                id: a.uploaded_by.id,
                name: a.uploaded_by.name,
                email: a.uploaded_by.email,
                avatar: a.uploaded_by.avatar_url,
                role: '',
                access_level: 'user' as const,
                organizationId: '',
                expectedHoursPerDay: 8,
                createdAt: '',
            }
            : undefined,
        createdAt: a.created_at,
    }
}

export const attachmentsApi = {
    /**
     * List all attachments for a task
     */
    list: async (taskId: string): Promise<Attachment[]> => {
        const response = await apiClient.get<{ success: boolean; data: BackendAttachment[] }>(
            `/tasks/${taskId}/attachments`
        )
        return response.data.data.map(mapBackendAttachmentToFrontend)
    },

    /**
     * Upload a file attachment for a task
     */
    upload: async (taskId: string, file: File): Promise<Attachment> => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await apiClient.post<{ success: boolean; data: BackendAttachment; message: string }>(
            `/tasks/${taskId}/attachments`,
            formData,
            {
                headers: {
                    // Axios automatically sets Content-Type for FormData
                },
                transformRequest: [(data) => data], // Prevent axios from transforming FormData
            }
        )
        return mapBackendAttachmentToFrontend(response.data.data)
    },

    /**
     * Delete an attachment
     */
    delete: async (taskId: string, attachmentId: string): Promise<void> => {
        await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`)
    },

    /**
     * Get download URL for an attachment (returns signed URL)
     */
    download: async (taskId: string, attachmentId: string): Promise<string> => {
        const response = await apiClient.get<{ success: boolean; data: { download_url: string; filename: string } }>(
            `/tasks/${taskId}/attachments/${attachmentId}/download`
        )
        return response.data.data.download_url
    },
}
