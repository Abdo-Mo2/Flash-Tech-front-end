import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { SiteShellComponent } from './layout/site-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: SiteShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/home-page.component').then(m => m.HomePageComponent)
      },
      {
        path: 'shop',
        loadComponent: () =>
          import('./features/catalog/listing-page.component').then(m => m.ListingPageComponent),
        data: { category: 'all' }
      },
      {
        path: 'shop/:category',
        loadComponent: () =>
          import('./features/catalog/listing-page.component').then(m => m.ListingPageComponent)
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/catalog/listing-page.component').then(m => m.ListingPageComponent)
      },
      {
        path: 'product/:id',
        loadComponent: () =>
          import('./features/product/product-page.component').then(m => m.ProductPageComponent)
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/cart/cart-page.component').then(m => m.CartPageComponent)
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/checkout/checkout-page.component').then(m => m.CheckoutPageComponent)
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./features/wishlist/wishlist-page.component').then(m => m.WishlistPageComponent)
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/contact/contact-page.component').then(m => m.ContactPageComponent)
      },
      {
        path: 'auth',
        loadComponent: () =>
          import('./features/auth/auth-page.component').then(m => m.AuthPageComponent)
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/account/account-shell.component').then(m => m.AccountShellComponent),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/account/account-overview.component').then(m => m.AccountOverviewComponent)
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./features/account/account-orders.component').then(m => m.AccountOrdersComponent)
          },
          {
            path: 'addresses',
            loadComponent: () =>
              import('./features/account/account-addresses.component').then(m => m.AccountAddressesComponent)
          },
          {
            path: 'wishlist',
            loadComponent: () =>
              import('./features/wishlist/wishlist-page.component').then(m => m.WishlistPageComponent)
          },
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/account/account-profile.component').then(m => m.AccountProfileComponent)
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/account/account-settings.component').then(m => m.AccountSettingsComponent)
          }
        ]
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'products', loadComponent: () => import('./features/admin/admin-products.component').then(m => m.AdminProductsComponent) },
      { path: 'products/new', loadComponent: () => import('./features/admin/admin-product-form.component').then(m => m.AdminProductFormComponent) },
      { path: 'products/:id/edit', loadComponent: () => import('./features/admin/admin-product-form.component').then(m => m.AdminProductFormComponent) },
      { path: 'orders', loadComponent: () => import('./features/admin/admin-orders.component').then(m => m.AdminOrdersComponent) },
      { path: 'orders/:id', loadComponent: () => import('./features/admin/admin-order-detail.component').then(m => m.AdminOrderDetailComponent) },
      { path: 'categories', loadComponent: () => import('./features/admin/admin-categories.component').then(m => m.AdminCategoriesComponent) },
      { path: 'hero-slides', loadComponent: () => import('./features/admin/admin-hero-slides.component').then(m => m.AdminHeroSlidesComponent) },
      { path: 'analytics', loadComponent: () => import('./features/admin/admin-analytics.component').then(m => m.AdminAnalyticsComponent) },
      { path: 'settings', loadComponent: () => import('./features/admin/admin-settings.component').then(m => m.AdminSettingsComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
