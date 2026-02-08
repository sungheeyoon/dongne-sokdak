'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { LoginForm } from "./LoginForm"
import { SignupForm } from "./SignupForm"
import { useUIStore } from "@/stores/useUIStore"

export function AuthDialog() {
  const { isAuthModalOpen, authMode, closeAuthModal, openAuthModal } = useUIStore()

  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    openAuthModal(value as 'signin' | 'signup')
  }

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">동네속닥</DialogTitle>
          <DialogDescription className="text-center">
            우리 동네 이야기를 시작해보세요.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={authMode} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <LoginForm onSuccess={closeAuthModal} />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignupForm onSuccess={closeAuthModal} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
