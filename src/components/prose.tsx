import type React from "react";

import { cn } from "@/lib/utils";

interface ProseProps extends React.ComponentPropsWithoutRef<"article"> {
  html: string;
}

export function Prose({ children, html, className }: ProseProps) {
  return (
    <article
      className={cn(
        "mx-auto prose prose-sm md:prose-base max-w-none dark:prose-invert marker:text-primary prose-h1:text-xl prose-h2:font-semibold prose-p:text-justify prose-a:text-primary",
        className,
      )}
    >
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : children}
    </article>
  );
}