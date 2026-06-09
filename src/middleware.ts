import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 默认密码，可以通过环境变量 SITE_PASSWORD 修改
const SITE_PASSWORD = process.env.SITE_PASSWORD || "xinsight2024";

// 公开路径（不拦截）
const PUBLIC_PATHS = [
  "/api/",
  "/_next/",
  "/favicon",
  "/login",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 放行公开路径
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 检查 cookie 是否已认证
  const authCookie = request.cookies.get("site_auth")?.value;
  if (authCookie === SITE_PASSWORD) {
    return NextResponse.next();
  }

  // 如果 URL 带了密码参数，验证并设置 cookie
  const passwordParam = request.nextUrl.searchParams.get("password");
  if (passwordParam) {
    if (passwordParam === SITE_PASSWORD) {
      const response = NextResponse.redirect(new URL(pathname, request.url));
      response.cookies.set("site_auth", SITE_PASSWORD, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 天有效
      });
      return response;
    }
    // 密码错误，跳回登录页
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl);
  }

  // 未认证，跳转到登录页
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/login") {
    loginUrl.searchParams.set("redirect", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
