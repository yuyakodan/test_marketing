import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const LP_PATH_PATTERN = /^\/lp\/([^/]+)\/([^/]+)$/

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Supabase認証セッション更新（環境変数が設定されている場合のみ）
  if (url && key) {
    const supabase = createServerClient(
      url,
      key,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired
    await supabase.auth.getUser()
  }

  // LP A/B Test Routing
  const { pathname } = request.nextUrl
  const match = pathname.match(LP_PATH_PATTERN)

  if (match) {
    const [, projectSlug, lpSlug] = match
    return handleLPRouting(request, supabaseResponse, projectSlug, lpSlug)
  }

  return supabaseResponse
}

async function handleLPRouting(
  request: NextRequest,
  response: NextResponse,
  projectSlug: string,
  lpSlug: string
): Promise<NextResponse> {
  const cookieName = `lp_variant_${lpSlug}`
  const existingVariant = request.cookies.get(cookieName)?.value

  if (existingVariant) {
    // Return same variant for returning users
    const url = request.nextUrl.clone()
    url.pathname = `/lp/${projectSlug}/${lpSlug}/${existingVariant}`
    const rewriteResponse = NextResponse.rewrite(url)
    rewriteResponse.headers.set('x-lp-variant', existingVariant)
    return rewriteResponse
  }

  // Assign new variant based on weighted random
  const variant = await assignVariant(lpSlug)

  const url = request.nextUrl.clone()
  url.pathname = `/lp/${projectSlug}/${lpSlug}/${variant}`
  const rewriteResponse = NextResponse.rewrite(url)

  // Set cookie for 30 days
  rewriteResponse.cookies.set(cookieName, variant, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  rewriteResponse.headers.set('x-lp-variant', variant)

  return rewriteResponse
}

async function assignVariant(lpSlug: string): Promise<string> {
  // TODO: Fetch weights from Supabase Edge Function or KV
  // For now, use simple 50/50 split
  const variants = [
    { code: 'A', weight: 50 },
    { code: 'B', weight: 50 },
  ]

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  let random = Math.random() * totalWeight

  for (const variant of variants) {
    random -= variant.weight
    if (random <= 0) {
      return variant.code
    }
  }

  return variants[0]?.code ?? 'A'
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
