'use client'

import {
  UiDialog,
  UiDialogContent,
  UiDialogDescription,
  UiDialogHeader,
  UiDialogTitle,
  UiDialogTrigger,
} from "@/shared/ui"
import {
  UiTabs,
  UiTabsContent,
  UiTabsList,
  UiTabsTrigger,
  UiButton
} from "@/shared/ui"
import { LoginForm } from "./LoginForm"
import { SignupForm } from "./SignupForm"
import { useUIStore } from "@/shared/stores/useUIStore"

export function AuthDialog() {
  const { isAuthModalOpen, authMode, closeAuthModal, openAuthModal } = useUIStore()

  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    openAuthModal(value as 'signin' | 'signup')
  }

  return (
    <UiDialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <UiDialogContent className="sm:max-w-md w-[320px] rounded-xl sm:rounded-xl">
        <UiDialogHeader className="mb-4">
          <UiDialogTitle className="text-xl font-bold text-center">동네 속닥</UiDialogTitle>
          <UiDialogDescription className="text-center">
            {authMode === 'signin' ? '로그인하고 동네 이야기를 나눠보세요' : '회원가입하고 동네 소식에 참여하세요'}
          </UiDialogDescription>
        </UiDialogHeader>

        <UiTabs value={authMode} onValueChange={handleTabChange} className="w-full">
          <UiTabsList className="grid w-full grid-cols-2 mb-6">
            <UiTabsTrigger value="signin">로그인</UiTabsTrigger>
            <UiTabsTrigger value="signup">회원가입</UiTabsTrigger>
          </UiTabsList>

          <UiTabsContent value="signin" className="space-y-4">
            <LoginForm onSuccess={closeAuthModal} />
          </UiTabsContent>

          <UiTabsContent value="signup" className="space-y-4">
            <SignupForm onSuccess={closeAuthModal} />
          </UiTabsContent>
        </UiTabs>
      </UiDialogContent>
    </UiDialog>
  )
}
