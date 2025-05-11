import React, { useEffect, useState } from "react";
import { SunMedium, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

function Header({ className }: React.ComponentProps<"div">) {
  const [isDark, setIsDark] = useState(false);

  // Check initial theme
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle("dark");
    setIsDark(root.classList.contains("dark"));
  };

  return (
    <header className={cn("flex justify-between items-center p-4", className)}>
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Mindly.io</h1>
      </div>
      <button
        onClick={toggleTheme}
        className="px-4 py-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
      >
        {isDark ? (
          <SunMedium className="h-4 w-4 text-white" />
        ) : (
          <Moon className="h-4 w-4 text-black" />
        )}
      </button>
    </header>
  );
}

export { Header };
