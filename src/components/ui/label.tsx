import { cn } from "@/lib/utils";
import { type ComponentProps } from "react";

function Label({ className, htmlFor, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      htmlFor={htmlFor}
      {...props}
    />
  );
}

export { Label };
