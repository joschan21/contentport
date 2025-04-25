import Prism from "prismjs"

import "prismjs/components/prism-clike"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-c"
import "prismjs/components/prism-css"
import "prismjs/components/prism-objectivec"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-powershell"
import "prismjs/components/prism-python"
import "prismjs/components/prism-rust"
import "prismjs/components/prism-swift"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-java"
import "prismjs/components/prism-cpp"

declare global {
  interface Window {
    Prism: typeof Prism
  }
}

if (typeof window !== "undefined") {
  window.Prism = Prism
}

export { Prism }
