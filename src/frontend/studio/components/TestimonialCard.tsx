import { cn } from "@/lib/utils";
import { testimonials as rawTestimonials, type Testimonial } from "@/constants/testimonials";

// Transform testimonials data for the component structure
const transformedTestimonials = rawTestimonials.map((testimonial) => ({
  body: testimonial.body,
  author: {
    name: testimonial.name,
    handle: testimonial.username.replace('@', ''),
    imageUrl: testimonial.img,
  },
}));

// Use the first testimonial as featured (pick one with good content)
const featuredTestimonial = {
  body: transformedTestimonials[1]?.body || "contentport actually makes writing tweets fun \n like i can just focus on the ideas instead of fighting the interface \nfeels like it was built by someone who actually uses twitter",
  author: {
    name: transformedTestimonials[1]?.author.name || "Iza",
    handle: transformedTestimonials[1]?.author.handle || "izadoesdev",
    imageUrl: transformedTestimonials[1]?.author.imageUrl || "/images/user/iza_128.jpg",
  },
};

// Organize remaining testimonials into grid structure (skip the featured one)
const remainingTestimonials = transformedTestimonials.filter((_, index) => index !== 1);

// Organize testimonials into columns for the grid layout
const organizeTestimonials = (testimonials: typeof remainingTestimonials) => {
  // Define how many testimonials you want in each column
  const columnSizes = [4, 3, 3, 4];

  const columns = [];
  let currentIndex = 0;

  for (const size of columnSizes) {
    const columnTestimonials = testimonials.slice(currentIndex, currentIndex + size);
    columns.push(columnTestimonials);
    currentIndex += size;

    // Stop if we've used all testimonials
    if (currentIndex >= testimonials.length) break;
  }

  // Filter out empty columns and ensure we have valid columns
  const validColumns = columns.filter(col => col.length > 0);

  // Organize into the expected structure: [columnGroup1, columnGroup2]
  const half = Math.ceil(validColumns.length / 2);
  return [
    validColumns.slice(0, half), // Left side
    validColumns.slice(half)     // Right side
  ];
};

const testimonials = organizeTestimonials(remainingTestimonials)


export default function Example() {
  return (
    <div className="relative isolate bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 grid-rows-1 gap-8 text-sm/6 text-gray-900 sm:mt-20 sm:grid-cols-2 xl:mx-0 xl:max-w-none xl:grid-flow-col xl:grid-cols-4">
          <figure className="rounded-2xl bg-white shadow-lg ring-1 ring-gray-900/5 sm:col-span-2 xl:col-start-2 xl:row-end-1">
            <blockquote className="p-6 text-lg font-semibold tracking-tight text-gray-900 sm:p-12 sm:text-xl/8">
              <p>{`“${featuredTestimonial.body}”`}</p>
            </blockquote>
            <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-4 border-t border-gray-900/10 px-6 py-4 sm:flex-nowrap">
              <img
                alt=""
                src={featuredTestimonial.author.imageUrl}
                className="size-10 flex-none rounded-full bg-gray-50"
              />
              <div className="flex-auto">
                <p className="font-semibold text-gray-900 leading-none">{featuredTestimonial.author.name}</p>
                <p className="text-gray-600">{`@${featuredTestimonial.author.handle} `}</p>
              </div>
            </figcaption>
          </figure>
          {testimonials.map((columnGroup, columnGroupIdx) => (
            <div key={columnGroupIdx} className="space-y-8 xl:contents xl:space-y-0">
              {columnGroup.map((column, columnIdx) => (
                <div
                  key={columnIdx}
                  className={cn(
                    (columnGroupIdx === 0 && columnIdx === 0) ||
                      (columnGroupIdx === testimonials.length - 1 && columnIdx === columnGroup.length - 1)
                      ? 'xl:row-span-2'
                      : 'xl:row-start-1',
                    'space-y-8',
                  )}
                >
                  {column.map((testimonial) => (
                    <figure
                      key={testimonial.author.handle}
                      className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5"
                    >
                      <blockquote className="text-gray-900">
                        <p>{`“${testimonial.body}”`}</p>
                      </blockquote>
                      <figcaption className="mt-6 flex items-center gap-x-4">
                        <img alt="" src={testimonial.author.imageUrl} className="size-10 rounded-full bg-gray-50" />
                        <div>
                          <p className="font-semibold text-gray-900 leading-none">{testimonial.author.name}</p>
                          <p className="text-gray-600">{`@${testimonial.author.handle} `}</p>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}