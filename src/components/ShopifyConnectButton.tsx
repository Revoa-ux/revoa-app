import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";

interface ShopifyConnectButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

const ShopifyConnectButton = React.forwardRef<
  HTMLButtonElement,
  ShopifyConnectButtonProps
>(({ className, children, loading = false, ...props }, ref) => {
  return (
    <button
      className={cn(
        "relative flex h-11 w-full items-center justify-center rounded-md text-sm font-medium transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-shopify-green/30 focus-visible:border-shopify-green",
        "bg-shopify-green text-white shadow-sm hover:bg-shopify-green/90 active:bg-shopify-green/95",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-shopify-green",
        "overflow-hidden group",
        className
      )}
      ref={ref}
      disabled={loading || props.disabled}
      {...props}
    >
      <span className={cn(
        "flex items-center gap-2 transition-transform duration-300",
        "group-hover:translate-x-0 group-focus:translate-x-0",
        loading ? "opacity-0" : "opacity-100",
      )}>
        {children}
        <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </button>
  );
});

ShopifyConnectButton.displayName = "ShopifyConnectButton";

export default ShopifyConnectButton;