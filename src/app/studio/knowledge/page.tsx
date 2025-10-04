'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { client } from '@/lib/client'
import { PenIcon, PlusIcon, UserFocusIcon } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from 'lucide-react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { MemoriesTab } from './memories-tab'
import { WritingStyleTab } from './writing-style-tab'
import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { Container } from '@/components/container'
import DuolingoButton from '@/components/ui/duolingo-button'
import { MemoriesModal } from './memories-modal'

interface Document {
  id: string
  title: string
  content: string
  updatedAt: Date
  category: 'url' | 'file' | 'manual'
  wordCount: number
  isStarred: boolean
}

const Page = () => {
  const [activeTab, setActiveTab] = useState('style')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Container
        title="Knowledge Base"
        description="Contentport automatically learns about you and your writing style the more you tweet."
      >
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          defaultValue="style"
          className="mt-6 w-full"
        >
          <div className="flex justify-between items-center">
            <TabsList className="bg-gray-200">
              <TabsTrigger
                className=""
                value="style"
                onClick={() => setActiveTab('style')}
              >
                <PenIcon className="size-5" />
                Writing Style
              </TabsTrigger>
              <TabsTrigger
                className=""
                value="memories"
                onClick={() => setActiveTab('memories')}
              >
                <UserFocusIcon className="size-5" />
                Memories
              </TabsTrigger>
            </TabsList>

            {activeTab === 'memories' && (
              <DuolingoButton className="w-fit" onClick={() => setIsModalOpen(true)}>
                <PlusIcon className="size-4 mr-1.5" weight="bold" /> New Memory
              </DuolingoButton>
            )}
          </div>

          <p className="text-base  text-gray-500 ml-1 mt-4">
            <span className="mr-1">👉</span>
            {activeTab === 'style' ? (
              <>
                <span className="font-medium text-gray-700">Writing style:</span>
                <span className="ml-1.5">
                  Contentport automatically learns from your past & most successful
                  tweets.
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-gray-700">Memories:</span>
                <span className="ml-1.5">
                  Store important context, preferences, and insights for personalized
                  content.
                </span>
              </>
            )}
          </p>

          <hr className="my-4 bg-gray-200 h-px" />

          <TabsContent value="style">
            <WritingStyleTab />
          </TabsContent>
          <TabsContent value="memories">
            <MemoriesTab />
          </TabsContent>
        </Tabs>
      </Container>

      <MemoriesModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
    </>
  )
}

export default Page
