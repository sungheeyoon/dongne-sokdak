import * as React from "react"
import { UiButton } from "@/components/ui"

interface UiSocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider: 'kakao' | 'google'
  children?: React.ReactNode
}

export function UiSocialButton({ provider, className, children, ...props }: UiSocialButtonProps) {
  const isKakao = provider === 'kakao'
  
  return (
    <UiButton
      variant="outline"
      type="button"
      className={`w-full flex items-center justify-center gap-2 ${
        isKakao 
          ? "bg-[#FEE500] hover:bg-[#FEE500]/90 text-black border-none" 
          : "bg-white hover:bg-gray-50 text-black border border-gray-200"
      } ${className || ""}`}
      {...props}
    >
      {isKakao ? (
        <svg viewBox="0 0 24 24" width="20" height="20" className="w-5 h-5">
            <path d="M12 3C5.373 3 0 6.956 0 11.835c0 3.09 2.164 5.815 5.506 7.37l-.995 3.653c-.085.312.235.568.514.412l4.288-2.857c.884.088 1.795.135 2.687.135 6.627 0 12-3.956 12-8.835S18.627 3 12 3z" fill="#000000"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" className="w-5 h-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      {children || (isKakao ? "카카오 로그인" : "Google 로그인")}
    </UiButton>
  )
}
