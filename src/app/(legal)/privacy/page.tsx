import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getSinglePost } from '@/lib/blog-query'
import { notFound } from 'next/navigation'
import { Prose } from '@/components/prose'
import type { Metadata } from 'next'

export const revalidate = 60 * 60 // 1 hour

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSinglePost('terms-of-service')

  if (!data || !data.post) {
    return {}
  }

  return {
    title: `${data.post.title} - Contentport`,
    description: data.post.description,
    twitter: {
      title: `${data.post.title} - Contentport`,
      description: data.post.description,
      card: 'summary_large_image',
      images: [
        {
          url: data.post.coverImage,
          width: '1200',
          height: '630',
          alt: data.post.title,
        },
      ],
    },
    openGraph: {
      title: `${data.post.title} - Contentport`,
      description: data.post.description,
      type: 'article',
      images: [
        {
          url: data.post.coverImage,
          width: '1200',
          height: '630',
          alt: data.post.title,
        },
      ],
    },
    alternates: {
      canonical: `/privacy`,
    },
  }
}

const PrivacyPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const data = await getSinglePost('privacy-policy')

  if (!data || !data.post) {
    return notFound()
  }

  return (
    <>
      <section className="bg-gray-100 min-h-screen">
        <div className="relative max-w-7xl mx-auto">
          <Navbar title={session ? 'Studio' : 'Get Started'} />
        </div>

        <div className="relative isolate pt-14">
          <div className="py-24 sm:pt-12 sm:pb-32">
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
              <div className="mx-auto text-left">
                <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl mb-8">
                  {data.post.title}
                </h1>
                <p className="text-gray-500 text-lg mb-8">
                  Last updated:{' '}
                  {new Date(data.post.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) || 'N/A'}
                </p>

                <Prose html={data.post.content} />

                <div className="mt-12 pt-8 border-t border-gray-200">
                  <Link
                    href="/"
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-500 font-medium"
                  >
                    ← Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}

export default PrivacyPage
