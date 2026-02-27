import { useState } from 'react'
import { ImageUseCases } from '../../domain/usecases'
import { apiImageRepository } from '../../data/apiImageRepository'

const imageUseCases = new ImageUseCases(apiImageRepository)

export function useImageUploadViewModel() {
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const uploadImage = async (file: File): Promise<string | null> => {
        setIsUploading(true)
        setError(null)
        try {
            const url = await imageUseCases.uploadImage(file)
            return url
        } catch (e: any) {
            console.error('Image upload failed:', e)
            setError(e)
            return null
        } finally {
            setIsUploading(false)
        }
    }

    return {
        uploadImage,
        isUploading,
        error
    }
}
