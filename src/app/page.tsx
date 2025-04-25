"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useMutation, useQuery } from "@tanstack/react-query"
import { client } from "@/lib/client"
import { useState } from "react"
import { toast } from "sonner"
import { HTTPException } from "hono/http-exception"
import NumberFlow from "@number-flow/react"

const Page = () => {
  const [email, setEmail] = useState("")

  const { data: countData, refetch } = useQuery({
    queryKey: ["waitlist-count"],
    queryFn: async () => {
      const res = await client.waitlist.count.$get()
      return res.json()
    },
  })

  const { mutate: joinWaitlist, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.waitlist.join.$post({ email })
      return res.json()
    },
    onSuccess: () => {
      refetch()
      toast.success("Successfully joined the waitlist!")
      setEmail("")
    },
    onError: (error) => {
      if (error instanceof HTTPException) {
        toast.error(error.message)
      } else {
        toast.error("Failed to join waitlist. Please try again.")
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    joinWaitlist()
  }

  return (
    <div className="flex min-h-screen items-center text-base leading-relaxed justify-center bg-stone-100 p-4">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 10px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)`,
            backgroundSize: "20px 20px",
            opacity: 0.8,
          }}
        />
      </div>

      <div className="mx-auto relative z-10 flex w-full max-w-4xl flex-col items-center justify-center rounded-3xl shadow-lg border border-stone-200  bg-white md:flex-row">
        <div className="flex flex-1 w-full flex-col items-start justify-center space-y-8 p-8 md:w-1/2">
          <div className="space-y-4">
            <h1 className="font-elegant text-4xl tracking-tight md:text-5xl">
              open source content creation studio
            </h1>
            <p className="text-gray-600">
              create content people care about — clear, on-brand, across every
              platform. contentport is the best way to create content with ai.
            </p>
          </div>
          <div className="w-full max-w-md space-y-3">
            <form
              className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0"
              onSubmit={handleSubmit}
            >
              <Input
                type="email"
                placeholder="you@example.com"
                className="flex-1 h-12 py-3 bg-sidebar !text-base placeholder:text-base leading-relaxed"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
              <Button 
                className="h-12 whitespace-nowrap" 
                type="submit" 
                disabled={isPending}
              >
                {isPending ? "Joining..." : "👉 Join Waitlist"}
              </Button>
            </form>
            <p className="text-xs text-gray-500 text-center sm:text-left">
              <span className="text-stone-800 font-medium">
                <NumberFlow value={countData?.count || 0} />
              </span>{" "}
              people have already joined the waitlist
            </p>
          </div>
        </div>
        <div className="relative hidden aspect-[1/1] p-6 w-full md:block md:w-1/2">
          <div className="relative select-none pointer-events-none w-full h-full rounded-2xl overflow-hidden">
            <Image
              src="/images/painting.png"
              alt="Content Creation Platform"
              fill
              className="rounded-r-lg object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
