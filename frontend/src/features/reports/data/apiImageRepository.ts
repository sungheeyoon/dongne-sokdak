import { ImageRepository } from '../domain/repositories'
import { uploadImage } from '@/lib/storage'

export class ApiImageRepository implements ImageRepository {
    async uploadImage(file: File): Promise<string> {
        return uploadImage(file)
    }
}

export const apiImageRepository = new ApiImageRepository()
