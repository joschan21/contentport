// "use client"

// import * as React from "react"

// type WrapperContextType = {
//   open: boolean
//   setOpen: (open: boolean) => void
//   toggleSidebar: () => void
//   setToggleSidebar: (fn: () => void) => void
// }

// const WrapperContext = React.createContext<WrapperContextType | undefined>(
//   undefined
// )

// export function useWrapper() {
//   const context = React.useContext(WrapperContext)

//   if (!context) {
//     throw new Error("useWrapper must be used within a WrapperProvider")
//   }

//   return context
// }

// interface WrapperProviderProps {
//   children: React.ReactNode
// }

// export function WrapperProvider({ children }: WrapperProviderProps) {
//   const [open, setOpen] = React.useState(false)
//   const [toggleSidebar, setToggleSidebarState] = React.useState<() => void>(
//     () => {
//       // Default empty function
//       return () => {}
//     }
//   )

//   const setToggleSidebar = React.useCallback((fn: () => void) => {
//     setToggleSidebarState(() => fn)
//   }, [])

//   const value = React.useMemo(
//     () => ({
//       open,
//       setOpen,
//       toggleSidebar,
//       setToggleSidebar,
//     }),
//     [toggleSidebar, setToggleSidebar]
//   )

//   return (
//     <WrapperContext.Provider value={value}>{children}</WrapperContext.Provider>
//   )
// }
