import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // UI v2 Input 계약 — docs/design/UI_V2_CONTRACT.md §4.2
          // 높이 44, 경계는 border-strong(비텍스트 대비 3:1), 오류는 aria-invalid로 전달한다.
          "flex h-11 w-full rounded-md border border-border-strong bg-surface px-3 type-body transition-colors",
          "file:border-0 file:bg-transparent file:type-label placeholder:text-muted-foreground",
          "focus-visible:border-brand",
          "aria-[invalid=true]:border-danger",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground disabled:border-border",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }