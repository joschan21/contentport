import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router'
import { LoginPage } from './auth/login'
import Page from './page'
import { Settings } from './settings/page'
import { ContextPage } from './studio/context/[id]/page'
import NewKnowledgePage from './studio/knowledge/new/page'
import KnowledgePage from './studio/knowledge/page'
import Layout from './studio/layout'
import StudioPage from './studio/page'

export default function App() {
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<p>not found</p>} />
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
            path="/studio/t/:id"
            element={
              <Layout>
                <StudioPage />
              </Layout>
            }
          />
          <Route
            path="/studio"
            element={
              <Layout>
                <StudioPage />
              </Layout>
            }
          />
          <Route
            path="/studio/knowledge"
            element={
              <Layout>
                <KnowledgePage />
              </Layout>
            }
          />
          <Route
            path="/studio/knowledge/new"
            element={
              <Layout>
                <NewKnowledgePage />
              </Layout>
            }
          />
          <Route
            path="/studio/knowledge/:id"
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
