import {
  PenLine,
  Megaphone,
  Search,
  Video,
  ShoppingCart,
  BarChart3,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'

export type AgentCategory = {
  id: string
  label: string
  icon: LucideIcon
  color: string
  description: string
}

export const AGENT_CATEGORIES: AgentCategory[] = [
  {
    id: 'copy',
    label: 'Copy & Contenido',
    icon: PenLine,
    color: '#F59E0B',
    description: 'Crea textos, hooks, scripts y captions que convierten',
  },
  {
    id: 'ads',
    label: 'Ads & Campañas',
    icon: Megaphone,
    color: '#EF4444',
    description: 'Diagnostica y optimiza tus campañas de Meta Ads',
  },
  {
    id: 'research',
    label: 'Product Research',
    icon: Search,
    color: '#3B82F6',
    description: 'Encuentra productos ganadores y analiza la competencia',
  },
  {
    id: 'ugc',
    label: 'UGC & Creativos',
    icon: Video,
    color: '#EC4899',
    description: 'Genera prompts de imagen y guiones para contenido UGC',
  },
  {
    id: 'ecommerce',
    label: 'Ecommerce',
    icon: ShoppingCart,
    color: '#22C55E',
    description: 'Gestiona tu tienda Shopify, proveedores y logística',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    color: '#8B5CF6',
    description: 'Analiza métricas de rendimiento y calcula ROI',
  },
  {
    id: 'strategy',
    label: 'Estrategia',
    icon: Lightbulb,
    color: '#F97316',
    description: 'Planifica tu negocio y prepara lanzamientos',
  },
]

export const PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude (Sonnet, Opus, Haiku)',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: '#D4A574',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: '#10A37F',
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini 2.5 Pro, Flash',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    color: '#4285F4',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Hermes 3, Llama, Mixtral y más',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    color: '#6366F1',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Admin API para tu tienda',
    placeholder: 'shpat_...',
    docsUrl: 'https://admin.shopify.com/store/YOUR-STORE/settings/apps/development',
    color: '#96BF48',
  },
  {
    id: 'dropi',
    name: 'Dropi',
    description: 'Proveedor dropshipping LATAM',
    placeholder: 'Tu API key de Dropi',
    docsUrl: 'https://dropi.com',
    color: '#FF6B35',
  },
] as const

export type ProviderId = (typeof PROVIDERS)[number]['id']
