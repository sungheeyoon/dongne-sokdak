import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 브라우저용 클라이언트 (클라이언트 컴포넌트에서 사용)
export const createClientComponentClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// 서버용 클라이언트 (서버 컴포넌트에서 사용)
export const createServerComponentClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}
