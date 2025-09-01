import { cn } from "@/lib/utils";
import { TestimonialsMarquee } from "./TestimonialsMarquee";
import { testimonials } from "@/constants/testimonials";

export default function TestimonialCard() {

    const reviews = testimonials

    const firstRow = reviews.slice(0, 4);
    const secondRow = reviews.slice(4);

    
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
              "relative h-full w-full cursor-pointer overflow-hidden rounded-xl border p-4 flex flex-col",
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
                  <figcaption className="text-md font-medium text-gray-600 dark:text-gray-400">
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
        {/* First Row - 4 Big, Centered Testimonials */}
        <div className="flex justify-center items-center w-full mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl">
            {firstRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
            ))}
          </div>
        </div>

        {/* Rest of the testimonials - flex wrap so last row centers */}
        <div className="flex justify-center items-center w-full">
          <div className="flex flex-wrap gap-6 justify-center max-w-7xl">
            {secondRow.map((review) => (
              <div
                key={review.username}
                className="
                  basis-full
                  sm:basis-[calc((100%-24px)/2)]
                  md:basis-[calc((100%-24px*2)/3)]
                  lg:basis-[calc((100%-24px*3)/4)]
                  xl:basis-[calc((100%-24px*4)/5)]
                "
              >
                <ReviewCard {...review} />
              </div>
            ))}
          </div>
        </div>
       </>
    )
}