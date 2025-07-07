import { supabase } from './supabase'

// 이미지 파일을 Supabase Storage에 업로드
export async function uploadImage(file: File, userId?: string): Promise<string> {
  try {
    // 파일 이름 생성 (중복 방지)
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomString}.${fileExtension}`
    
    // 사용자별 폴더 구조 (선택사항)
    const folderPath = userId ? `${userId}/${fileName}` : `public/${fileName}`

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('report-images')
      .upload(folderPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) {
      throw new Error(`이미지 업로드 실패: ${error.message}`)
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from('report-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('이미지 업로드 오류:', error)
    throw error
  }
}
// 이미지 파일 삭제
export async function deleteImage(filePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('report-images')
      .remove([filePath])

    if (error) {
      throw new Error(`이미지 삭제 실패: ${error.message}`)
    }
  } catch (error) {
    console.error('이미지 삭제 오류:', error)
    throw error
  }
}

// 파일 경로에서 버킷 내 경로 추출
export function extractStoragePath(publicUrl: string): string {
  // 예: https://kunocgamcbeobrikwhie.supabase.co/storage/v1/object/public/report-images/user123/12345-abc.jpg
  // -> user123/12345-abc.jpg
  const parts = publicUrl.split('/report-images/')
  return parts[1] || ''
}
