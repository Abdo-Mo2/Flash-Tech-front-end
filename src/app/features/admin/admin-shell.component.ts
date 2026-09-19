import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-[var(--black)] text-[var(--ink)]">
      <header class="flex h-[72px] items-center gap-5 border-b border-[var(--line)] bg-[var(--mist)] px-[30px]">
        <button class="text-xl md:hidden" type="button" aria-label="Open admin menu" (click)="open = !open">☰</button>
        <a routerLink="/admin/dashboard" class="flex items-center gap-2.5 font-['Space_Grotesk'] text-xl font-bold text-[var(--ink)] no-underline"><b class="grid h-[34px] w-[34px] place-items-center rounded-lg bg-[var(--amber)] text-[var(--black)]">F</b> Flash<span class="text-[var(--amber)]">Tech</span></a>
        <a routerLink="/" class="text-[13px] text-[#d8dad7] no-underline hover:text-[var(--amber)]">View storefront ↗</a>
        <div class="ml-auto flex items-center gap-3.5 text-[13px] text-[#d8dad7]">{{ auth.user()?.email }} <button class="rounded-md border border-[#555b60] px-3 py-2" type="button" (click)="auth.logout()">Log out</button></div>
      </header>
      <div class="flex min-h-[calc(100vh-72px)]">
        <aside class="w-60 shrink-0 border-r border-[var(--line)] bg-[#080807] px-3.5 py-7 max-md:fixed max-md:bottom-0 max-md:top-[72px] max-md:z-10 max-md:-left-60 max-md:transition-[left] max-md:duration-200" [class.left-0]="open">
          <nav class="flex flex-col gap-[5px]" aria-label="Admin navigation">
            <a class="rounded-md border-l-[3px] border-transparent px-3.5 py-3 text-sm text-[var(--text-2)] no-underline hover:border-[var(--amber)] hover:bg-[#211c0f] hover:font-semibold hover:text-[var(--amber)]" routerLink="/admin/dashboard" routerLinkActive="!border-[var(--amber)] !bg-[#211c0f] !font-semibold !text-[var(--amber)]">Dashboard</a>
            <a class="rounded-md border-l-[3px] border-transparent px-3.5 py-3 text-sm text-[var(--text-2)] no-underline hover:border-[var(--amber)] hover:bg-[#211c0f] hover:font-semibold hover:text-[var(--amber)]" routerLink="/admin/products" routerLinkActive="!border-[var(--amber)] !bg-[#211c0f] !font-semibold !text-[var(--amber)]">Products</a>
            <a class="rounded-md border-l-[3px] border-transparent px-3.5 py-3 text-sm text-[var(--text-2)] no-underline hover:border-[var(--amber)] hover:bg-[#211c0f] hover:font-semibold hover:text-[var(--amber)]" routerLink="/admin/categories" routerLinkActive="!border-[var(--amber)] !bg-[#211c0f] !font-semibold !text-[var(--amber)]">Categories</a>
            <a class="rounded-md border-l-[3px] border-transparent px-3.5 py-3 text-sm text-[var(--text-2)] no-underline hover:border-[var(--amber)] hover:bg-[#211c0f] hover:font-semibold hover:text-[var(--amber)]" routerLink="/admin/hero-slides" routerLinkActive="!border-[var(--amber)] !bg-[#211c0f] !font-semibold !text-[var(--amber)]">Hero slides</a>
            <a class="rounded-md border-l-[3px] border-transparent px-3.5 py-3 text-sm text-[var(--text-2)] no-underline hover:border-[var(--amber)] hover:bg-[#211c0f] hover:font-semibold hover:text-[var(--amber)]" routerLink="/admin/analytics" routerLinkActive="!border-[var(--amber)] !bg-[#211c0f] !font-semibold !text-[var(--amber)]">Analytics</a>
            <a class="rounded-md border-l-[3px] border-transparent px-3.5 py-3 text-sm text-[var(--text-2)] no-underline hover:border-[var(--amber)] hover:bg-[#211c0f] hover:font-semibold hover:text-[var(--amber)]" routerLink="/admin/orders" routerLinkActive="!border-[var(--amber)] !bg-[#211c0f] !font-semibold !text-[var(--amber)]">Orders</a>
            <a class="rounded-md border-l-[3px] border-transparent px-3.5 py-3 text-sm text-[var(--text-2)] no-underline hover:border-[var(--amber)] hover:bg-[#211c0f] hover:font-semibold hover:text-[var(--amber)]" routerLink="/admin/settings" routerLinkActive="!border-[var(--amber)] !bg-[#211c0f] !font-semibold !text-[var(--amber)]">Settings</a>
          </nav>
        </aside>
        <main class="min-w-0 max-w-[1400px] flex-1 p-[34px] max-md:p-4"><router-outlet /></main>
      </div>
    </div>
  `
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  open = false;
}
