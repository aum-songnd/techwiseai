import React from "react";
import { Loader2 } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-3">
      <p className="text-3xl font-extrabold tracking-tight">
        <span className="text-shop_dark_green">TechWise</span>
        <span className="text-shop-light-green">AI</span>
      </p>

      <div className="flex items-center gap-2 text-shop-light-green">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
        <span className="text-sm font-medium">TechWiseAI is loading...</span>
      </div>
    </div>
  );
};

export default Loading;