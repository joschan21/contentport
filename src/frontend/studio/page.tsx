import TweetEditor from "@/components/tweet-editor/tweet-editor"
import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { OnboardingModal } from "./components/onboarding-modal"
import { useSearchParams } from "next/navigation"

export default function StudioPage() {
  const [isOpen, setIsOpen] = useState(false)
  const searchParams = useSearchParams()
  const onboarding = searchParams.get("onboarding") === "true"

  const { data, isSuccess } = useQuery({
    queryKey: ["get-connected-account"],
    queryFn: async () => {
      const res = await client.settings.connectedAccount.$get()
      return await res.json()
    },
  })

  console.log('data', data);

  useEffect(() => {
    if ((isSuccess && !data.account) || onboarding) {
      setIsOpen(true)
    }
  }, [data?.account, isSuccess, onboarding])

  return (
    <>
      {isOpen ? <OnboardingModal onOpenChange={setIsOpen} /> : null}
      <div className="max-w-xl w-full mx-auto">
        <TweetEditor />
      </div>
    </>
  )
}
