import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  message?: string;
  className?: string;
}

const Loading = ({
  message = "TechWiseAI is loading...",
  className = "min-h-[70vh]",
}: LoadingProps) => {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-3 ${className}`}
    >
      <p className="text-3xl font-extrabold tracking-tight">
        <span className="text-shop_dark_green">TechWise</span>
        <span className="text-shop_light_green">AI</span>
      </p>

      <div className="flex items-center gap-2 text-shop_light_green">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

export default Loading;