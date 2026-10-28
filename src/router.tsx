import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from '../components/ui/sonner'
import { NotFoundPage, RouteErrorPage } from '../components/error-pages'

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </>
  )
}
