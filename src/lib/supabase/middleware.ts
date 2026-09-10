import { isDemoMode } from "@/lib/demo/mode";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("YOUR_PROJECT") &&
      key !== "your-anon-key" &&
      url.startsWith("http")
  );
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/signup");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isCompleteSetup = path.startsWith("/complete-setup");
  const isMarketingPage =
    path === "/" ||
    path.startsWith("/how-it-works") ||
    path.startsWith("/contact");
  const isLegalPage =
    path.startsWith("/privacy") ||
    path.startsWith("/privacy-policy") ||
    path.startsWith("/terms") ||
    path.startsWith("/refunds") ||
    path.startsWith("/refund-policy");
  const isSetupPage = path.startsWith("/setup");
  const isShortLink = path.startsWith("/i/");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path.startsWith("/marketing") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path.startsWith("/api");

  // Demo mode: skip Supabase entirely, allow the app through
  if (isDemoMode()) {
    if (isSetupPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }

  if (!hasSupabaseEnv()) {
    if (
      isSetupPage ||
      isPublicAsset ||
      isShortLink ||
      isLegalPage ||
      isMarketingPage ||
      isAuthCallback
    ) {
      return NextResponse.next({ request: { headers: request.headers } });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Middleware auth timed out")), 8000)
      ),
    ]);
    user = result.data.user;
  } catch {
    // Fail open to login rather than hanging the whole app on a stuck auth call
    if (
      !isAuthPage &&
      !isCompleteSetup &&
      !isSetupPage &&
      !isPublicAsset &&
      !isShortLink &&
      !isLegalPage &&
      !isMarketingPage &&
      !isAuthCallback
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const isPublic =
    isAuthPage ||
    isCompleteSetup ||
    isSetupPage ||
    isPublicAsset ||
    isShortLink ||
    isLegalPage ||
    isMarketingPage ||
    isAuthCallback;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!user && isCompleteSetup) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
