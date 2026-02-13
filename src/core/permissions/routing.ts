type RoleRouteConfig = Record<string, string[]>;

export const publicRoutes = ["/login"];

export const roleRoutes: RoleRouteConfig = {
  captain: [
    "/",
    "/analytics",
    "/analytics/*",
    "/check-in",
    "/check-in/*",
    "/check-out",
    "/check-out/*",
    "/documents",
    "/documents/*",
    "/job/*",
    "/jobs",
    "/jobs/*",
    "/profile",
    "/profile/*",
  ],
};

export const hasAccess = (role: string, path: string): boolean => {
  const normalizedRole = role.toLowerCase().trim();
  const allowedRoutes = roleRoutes[normalizedRole] || roleRoutes.captain || [];

  if (allowedRoutes.includes(path)) {
    return true;
  }

  return allowedRoutes.some((route) => {
    if (!route.endsWith("/*")) {
      return false;
    }
    const baseRoute = route.slice(0, -2);
    return path.startsWith(baseRoute);
  });
};

export const isPublicRoute = (path: string): boolean => {
  if (publicRoutes.includes(path)) {
    return true;
  }
  return publicRoutes.some((route) =>
    route !== "/" && path.startsWith(`${route}/`)
  );
};
