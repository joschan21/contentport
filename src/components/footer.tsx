import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:items-start items-center">
            <p className="text-gray-600 text-center mb-6 sm:mb-2 text-pretty sm:text-left text-base">
              Your content engine for growing on Twitter.
            </p>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear() == 2025 ? '2025' : `${new Date().getFullYear() - 1} - ${new Date().getFullYear()}`} Contentport.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link 
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors" 
              href="/pricing"
            >
              Pricing
            </Link>
            <Link 
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors" 
              href="/privacy"
            >
              Privacy Policy
            </Link>
            <Link 
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors" 
              href="/terms"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
