import { Toaster } from "react-hot-toast"
import { BrowserRouter, Route, Routes } from "react-router"
import Page from "./page"
import { Settings } from "./settings/page"
import { ContextPage } from "./studio/context/[id]/page"
import Layout from "./studio/layout"
import { Studio } from "./studio/page"
import { LoginPage } from "./auth/login"

export default function App() {
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/settings"
            element={
              <Layout hideAppSidebar>
                <Settings />
              </Layout>
            }
          />
          <Route
            path="/studio"
            element={
              <Layout>
                <Studio />
              </Layout>
            }
          />
          <Route
            path="/studio/context"
            element={
              <Layout>
                <ContextPage />
              </Layout>
            }
          />
          <Route
            path="/studio/context/:id"
            element={
              <Layout>
                <ContextPage />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  )
}
