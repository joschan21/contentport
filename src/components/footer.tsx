import Link from 'next/link'

const Footer = () => {
return (
    <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex flex-col items-center md:items-start">
                    <p>© {new Date().getFullYear()} contentport</p>
                </div>
                <div className="flex items-center gap-4 md:items-end">
                    <Link className="text-gray-700 hover:text-black" href="/privacy">Privacy Policy</Link>
                    <div className="h-4 w-px bg-gray-400" />
                    <Link className="text-gray-700 hover:text-black" href="/terms">Terms of Service</Link>
                </div>
            </div>
        </div>
    </footer>
  )
}

export default Footer
