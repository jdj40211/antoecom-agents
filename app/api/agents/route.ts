import { NextResponse } from 'next/server'
import { getAllAgents } from '@/lib/agents/catalog'

export async function GET() {
  const agents = getAllAgents()
  return NextResponse.json({ agents })
}
