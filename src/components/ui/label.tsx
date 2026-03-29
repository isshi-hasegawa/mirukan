import { cn } from "@/lib/utils";
import { type ComponentProps } from "react";

function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
