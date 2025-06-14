import ClientLayout from '@/frontend/studio/layout'
import { cookies } from 'next/headers'
import { PropsWithChildren } from 'react'

export default async function Layout({children}: PropsWithChildren) {
  const cookieStore = await cookies()

  return <ClientLayout cookies={cookieStore}>{children}</ClientLayout>
}
