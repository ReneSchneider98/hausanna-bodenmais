import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('robots.txt', 'routes/robots.ts'),
  route(':slug', 'routes/slug.tsx'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
