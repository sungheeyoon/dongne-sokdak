import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const providerError = requestUrl.searchParams.get('error')

    if (providerError) {
        console.error('OAuth provider returned an error:', {
            error: providerError,
            description: requestUrl.searchParams.get('error_description'),
        })
        return NextResponse.redirect(`${requestUrl.origin}/?authError=1`)
    }

    if (code) {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('OAuth code exchange failed:', error)
            return NextResponse.redirect(`${requestUrl.origin}/?authError=1`)
        }
    }

    // 로그인 후 홈으로 리다이렉트
    return NextResponse.redirect(requestUrl.origin)
}
