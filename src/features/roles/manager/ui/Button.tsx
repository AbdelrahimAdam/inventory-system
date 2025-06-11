import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/utils/utils";
import { cva } from "class-variance-authority";

const variantClasses = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        subtle: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      type,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    // Provide default type="button" only if not passed and not asChild (otherwise Slot could be any component)
    const buttonType = !asChild && !type ? "button" : type;

    return (
      <Comp
        className={cn(variantClasses({ variant, size }), className)}
        ref={ref}
        type={buttonType}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
