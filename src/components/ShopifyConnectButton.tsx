import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight as ArrowRightIcon } from "lucide-react";

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
        "relative flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/30",
        "bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white shadow-sm hover:scale-[1.02]",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
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