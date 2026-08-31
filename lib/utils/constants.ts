import {
  PenLine,
  Megaphone,
  Search,
  Video,
  ShoppingCart,
  BarChart3,
  Lightbulb,
  ArrowUpRight,
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
  {
    id: 'cro',
    label: 'CRO & Conversión',
    icon: ArrowUpRight,
    color: '#14B8A6',
    description: 'Audita y optimiza tu tienda para convertir más',
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
] as const

// Shopify y Dropi estuvieron acá como providers, pero ninguna ejecución los
// usaba y su "verificación" solo miraba que la key tuviera más de 5 caracteres.
// Pedirle al usuario credenciales de su tienda para no hacer nada con ellas es
// peor que no ofrecerlas. El CHECK de user_api_keys todavía los acepta, así que
// se pueden reponer cuando exista la integración de verdad.

export type ProviderId = (typeof PROVIDERS)[number]['id']
