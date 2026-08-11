import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * UI v2 Button 계약 — docs/design/UI_V2_CONTRACT.md §4.1
 *
 * 계약 이름은 primary / secondary / ghost / danger 다.
 * default / outline / destructive 는 전환이 끝나지 않은 화면을 위한 별칭이며
 * 같은 스타일을 가리킨다 (#16–#20에서 호출부를 옮긴다).
 *
 * 비활성은 opacity로 표현하지 않는다 (§3.6) — 대비가 예측 불가능해지기 때문이다.
 */
const PRIMARY = "bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-pressed"
const SECONDARY = "border border-border-strong bg-surface text-foreground hover:bg-surface-muted"
const GHOST = "text-foreground hover:bg-surface-muted"
const DANGER = "bg-danger text-danger-foreground hover:bg-danger/90"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md type-label transition-colors disabled:pointer-events-none disabled:bg-surface-muted disabled:text-muted-foreground disabled:border-border [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: PRIMARY,
        secondary: SECONDARY,
        ghost: GHOST,
        danger: DANGER,
        // 별칭
        default: PRIMARY,
        outline: SECONDARY,
        destructive: DANGER,
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        // md — 기본. 모바일 히트 영역 44px을 그대로 만족한다.
        default: "h-11 px-4",
        sm: "h-9 px-3",
        lg: "h-13 px-5 type-body font-semibold",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }