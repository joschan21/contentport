import { cn } from "@/lib/utils";
import { TestimonialsMarquee } from "./TestimonialsMarquee";
import { testimonials } from "@/constants/testimonials";

export default function TestimonialCard() {

    const reviews = testimonials
    
      const firstRow = reviews.slice(0, reviews.length / 2);
      const secondRow = reviews.slice(reviews.length / 2);
    
      const ReviewCard = ({
        img,
        name,
        username,
        body,
        href,
        title,
      }: {
        img: string;
        name: string;
        username: string;
        body: string;
        href: string;
        title?: string;
      }) => {
        return (
          <figure
            className={cn(
              "relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border p-4 flex flex-col",
              // light styles
              "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
              // dark styles
              "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img className="rounded-full" width="40" height="40" alt="" src={img} />
                <div className="flex flex-col">
                  <figcaption className="text-base font-medium text-gray-600 dark:text-gray-400">
                    {name}
                  </figcaption>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{username}</p>
                </div>
              </div>
    
              {/* SVG rechts */}
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-gray-800">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="opacity-90"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
            <blockquote className="mt-2 text-sm text-gray-600 dark:text-gray-400">{body}</blockquote>
            <div className="mt-auto ">
              {title && <figcaption className="mt-2 text-xs text-gray-500">{title}</figcaption>}
            </div>
          </figure>
        );
      };

    return (
       <>
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        <TestimonialsMarquee pauseOnHover className="[--duration:60s]">
          {firstRow.map((review) => (
            <ReviewCard key={review.username} {...review} />
          ))}
        </TestimonialsMarquee>
        <TestimonialsMarquee reverse pauseOnHover className="[--duration:60s]">
          {secondRow.map((review) => (
            <ReviewCard key={review.username} {...review} />
          ))}
        </TestimonialsMarquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
      </div>
       </>
    )
}