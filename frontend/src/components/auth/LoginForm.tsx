'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { UiButton as Button } from "@/components/ui"
import { UiInput as Input } from "@/components/ui"
import { UiSocialButton } from "@/components/ui"
import { UiForm as Form, UiFormControl as FormControl, UiFormField as FormField, UiFormItem as FormItem, UiFormLabel as FormLabel, UiFormMessage as FormMessage } from "@/components/ui"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
})

type LoginValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signInWithEmail, signInWithKakao, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginValues) {
    setIsLoading(true)
    setError(null)
    
    try {
      await signInWithEmail(data.email, data.password)
      if (onSuccess) onSuccess()
      router.refresh() // 상태 갱신
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="비밀번호를 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            로그인
          </Button>
        </form>
      </Form>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            또는 소셜 로그인
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <UiSocialButton 
          provider="kakao" 
          disabled={isLoading} 
          onClick={signInWithKakao}
        />
        <UiSocialButton 
          provider="google" 
          disabled={isLoading} 
          onClick={signInWithGoogle}
        />
      </div>
    </div>
  )
}
