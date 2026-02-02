import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Lock as LockIcon, ShoppingBag } from "lucide-react";

interface ShopifyFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const ShopifyFormInput = React.forwardRef<HTMLInputElement, ShopifyFormInputProps>(
  ({ className, label, error, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [filled, setFilled] = useState(!!props.value);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilled(!!e.target.value);
      props.onChange?.(e);
    };

    return (
      <div className="space-y-2 w-full">
        {label && (
          <label
            htmlFor={props.id}
            className={cn(
              "text-sm font-medium transition-colors duration-150",
              focused ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {label}
          </label>
        )}
        
        <div className={cn(
          "relative w-full group transition-all duration-200",
          error ? "mb-1" : "mb-0"
        )}>
          <div className={cn(
            "absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground transition-all duration-200",
            "text-gray-400 dark:text-gray-500"
          )}>
            {props.type === "password" ? (
              <LockIcon className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </div>

          <input
            ref={ref}
            {...props}
            onChange={handleChange}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "flex h-10 w-full rounded-lg border px-3 py-2 pl-10 text-sm",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "text-gray-900 dark:text-white",
              "disabled:text-gray-900 dark:disabled:text-white",
              "bg-white dark:bg-dark",
              "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 focus-visible:border-primary-500",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200 shadow-sm",
              error
                ? "border-red-300 dark:border-red-600 focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-red-500"
                : "border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500",
              className
            )}
          />
        </div>
        
        {error && (
          <p className="text-sm font-medium text-red-500 dark:text-red-400 mt-1 ml-1 animate-in">
            {error}
          </p>
        )}
      </div>
    );
  }
);

ShopifyFormInput.displayName = "ShopifyFormInput";

export default ShopifyFormInput;