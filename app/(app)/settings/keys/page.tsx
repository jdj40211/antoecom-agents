'use client'

import { ApiKeyManager } from '@/components/settings/ApiKeyManager'

export default function KeysPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <ApiKeyManager />
    </div>
  )
}
