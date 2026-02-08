'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Mail, CheckCircle } from "lucide-react"

import { 
  UiButton as Button, 
  UiInput as Input, 
  UiForm as Form, 
  UiFormControl as FormControl, 
  UiFormField as FormField, 
  UiFormItem as FormItem, 
  UiFormLabel as FormLabel, 
  UiFormMessage as FormMessage,
  UiDialog as Dialog,
  UiDialogContent as DialogContent,
  UiDialogHeader as DialogHeader,
  UiDialogTitle as DialogTitle,
  UiDialogDescription as DialogDescription,
  UiDialogFooter as DialogFooter
} from "@/components/ui"
import { useAuth } from "@/hooks/useAuth"

const signupSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
  confirmPassword: z.string(),
  nickname: z.string().min(2, "닉네임은 최소 2자 이상이어야 합니다."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
})

type SignupValues = z.infer<typeof signupSchema>

interface SignupFormProps {
  onSuccess?: () => void
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { signUpWithEmail } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      nickname: "",
    },
  })

  async function onSubmit(data: SignupValues) {
    setIsLoading(true)
    setError(null)
    
    try {
      await signUpWithEmail(data.email, data.password, data.nickname)
      setShowSuccessDialog(true)
    } catch (err: any) {
      setError(err.message || "회원가입에 실패했습니다.")
      setIsLoading(false)
    }
  }

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false)
    if (onSuccess) onSuccess()
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>닉네임</FormLabel>
                <FormControl>
                  <Input placeholder="동네주민" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="6자 이상 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 확인</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="비밀번호를 다시 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md flex items-center">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            가입하기
          </Button>
        </form>
      </Form>

      <Dialog open={showSuccessDialog} onOpenChange={handleSuccessDialogClose}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl text-center">이메일을 확인해주세요</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <span className="font-semibold text-foreground">{form.getValues().email}</span>로<br />
              인증 메일을 발송했습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            메일함에서 인증 링크를 클릭하시면<br/>회원가입이 완료됩니다.
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleSuccessDialogClose} className="w-full sm:w-auto min-w-[120px]">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}