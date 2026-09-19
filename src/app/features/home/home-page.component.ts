import { Component, OnDestroy, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { HeroService, HeroSlide } from '../../core/services/hero.service';
import { CategoryService, StoreApiCategory } from '../../core/services/category.service';
import { ToastService } from '../../core/services/toast.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { ProductSkeletonComponent } from '../../shared/components/product-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    NgClass,
    ProductCardComponent,
    ProductSkeletonComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="bg-[var(--black)] pt-6" aria-roledescription="carousel" aria-label="Featured offers">
      @if (slides().length) {
        <div class="mx-auto max-w-[1440px] px-4 md:px-6">
          <div class="relative home-hero-wrap">
            <a
              class="relative block w-full overflow-hidden rounded-2xl bg-[var(--black)] text-[var(--ink)] no-underline home-hero-frame"
              [class]="heroTransition() === 'a' ? 'hero-enter-a' : 'hero-enter-b'"
              [routerLink]="slides()[heroIndex()].cta_destination"
            >
              @if (slides()[heroIndex()].image_url) {
                <img
                  [src]="heroImageFailed() ? fallbackImage : slides()[heroIndex()].image_url"
                  [alt]="slides()[heroIndex()].title"
                  (error)="heroImageFailed.set(true)"
                  width="1920"
                  height="720"
                  fetchpriority="high"
                  decoding="async"
                />
              } @else {
                <div class="flex h-full flex-col justify-center bg-[radial-gradient(circle_at_80%_45%,#413116_0%,transparent_20%),linear-gradient(115deg,#171310,#2a2013_45%,#0a0908)] p-6 sm:p-10 lg:p-16" aria-hidden="true">
                  <span class="max-w-[58%] font-['Space_Grotesk'] text-[clamp(32px,6.2vw,74px)] font-bold uppercase leading-[0.98] tracking-[-0.055em] text-[var(--ink)]">{{ slides()[heroIndex()].title }}</span>
                  <small class="mt-4 text-[clamp(13px,1.6vw,19px)] text-[var(--text-2)]">{{ slides()[heroIndex()].description }}</small>
                </div>
              }
              <span class="sr-only">{{ slides()[heroIndex()].title }}</span>
            </a>
            <button class="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[rgba(10,9,8,0.42)] text-3xl text-[var(--ink)] opacity-60 transition hover:bg-[var(--amber)] hover:text-[var(--black)] sm:left-6" type="button" aria-label="Previous slide" (click)="prevHero()">‹</button>
            <button class="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[rgba(10,9,8,0.42)] text-3xl text-[var(--ink)] opacity-60 transition hover:bg-[var(--amber)] hover:text-[var(--black)] sm:right-6" type="button" aria-label="Next slide" (click)="nextHero()">›</button>
            <div class="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
              @for (s of slides(); track s.id; let i = $index) {
                <button
                  [ngClass]="i === heroIndex() ? 'w-5 bg-[var(--amber)]' : 'w-1.5 bg-white/40'"
                  class="h-1.5 rounded-full border-0 p-0 transition-all"
                  [attr.aria-label]="'Go to slide ' + (i + 1)"
                  type="button"
                  (click)="goToHero(i)"
                ></button>
              }
            </div>
          </div>
        </div>
      }
    </section>

    <div class="wrap">
      <section class="home-section">
      <div class="home-section-head">
        <div><h2>Popular Now</h2><p>What the store is actually selling this week</p></div>
        <a routerLink="/shop">View all <span>›</span></a>
      </div>
      @if (featuredError()) {
        <app-empty-state title="Couldn't load featured laptops" message="Check your connection and try again.">
          <button class="btn btn-primary" type="button" (click)="load()">Retry</button>
        </app-empty-state>
      } @else if (loadingFeatured()) {
        <div class="grid4"><app-product-skeleton [count]="8" /></div>
      } @else {
        <div class="grid4 home-product-grid">
          @for (p of trending().slice(0, 8); track p.id) { <app-product-card [product]="p" /> }
        </div>
      }
      </section>

      <section class="home-section home-section-compact">
      <div class="home-section-head">
        <div><h2>Shop by Category</h2><p>Every category the store carries, one tap away</p></div>
      </div>
      @if (categories().length) {
        <div class="home-discovery-carousel">
          <button class="home-discovery-arrow previous" type="button" aria-label="Scroll categories left" (click)="scrollCategories('left')">‹</button>
          <div class="home-discovery-grid" #categoryTrack>
          @for (category of categories(); track category.slug) {
            <a class="home-discovery-tile" [routerLink]="['/shop', category.slug]">
              <img [src]="categoryImage(category.slug)" [alt]="category.name" />
              <span>{{ category.name }}</span>
              <i>›</i>
            </a>
          }
          </div>
          <button class="home-discovery-arrow next" type="button" aria-label="Scroll categories right" (click)="scrollCategories('right')">›</button>
        </div>
      }
      </section>

      <section class="home-section home-section-compact">
      <div class="home-section-head">
        <div><h2>New Releases</h2><p>Just landed — selected from the newest live catalog</p></div>
        <a routerLink="/shop">View all <span>›</span></a>
      </div>
      @if (loadingTrend()) {
        <div class="grid4"><app-product-skeleton [count]="8" /></div>
      } @else {
        <div class="grid4 home-product-grid">
          @for (p of newReleases().slice(0, 8); track p.id) { <app-product-card [product]="p" /> }
        </div>
      }
      </section>

      @if (deals().length) {
        <section class="home-deals">
          <div class="home-section-head">
            <div><small>Live now</small><h2>Deals</h2></div>
            <a routerLink="/shop/deals">View all <span>›</span></a>
          </div>
          <div class="home-scroll-row">
            @for (p of deals(); track p.id) { <app-product-card [product]="p" /> }
          </div>
        </section>
      }

      @if (brands().length) {
        <section class="home-brands">
        <div class="home-section-head home-brand-heading">
          <div><h2>Shop by Brand</h2></div>
        </div>
        <div class="home-brand-row">
          @for (brand of brands(); track brand) {
            <a class="brand-chip" [routerLink]="'/search'" [queryParams]="{ q: brand }">{{ brand }}</a>
          }
        </div>
        </section>
      }

    </div>
    <section class="home-trust"><div class="wrap home-trust-grid">
      <div><b>✦</b><p><strong>Free Shipping</strong><span>Cairo &amp; Giza, always</span></p></div>
      <div><b>◈</b><p><strong>Official Warranty</strong><span>On every product sold</span></p></div>
      <div><b>↻</b><p><strong>Easy Returns</strong><span>14-day return window</span></p></div>
      <div><b>◌</b><p><strong>Real Support</strong><span>Talk to an actual human</span></p></div>
    </div></section>
  `
})
export class HomePageComponent implements OnDestroy {
  private readonly products = inject(ProductService);
  private readonly heroes = inject(HeroService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);

  readonly featured = signal<Product[]>([]);
  readonly trending = signal<Product[]>([]);
  readonly slides = signal<HeroSlide[]>([]);
  readonly categories = signal<StoreApiCategory[]>([]);
  readonly brands = signal<string[]>([]);
  readonly newReleases = signal<Product[]>([]);
  readonly deals = signal<Product[]>([]);
  readonly heroIndex = signal(0);
  readonly heroTransition = signal<'a' | 'b'>('a');
  readonly heroImageFailed = signal(false);
  readonly fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"%3E%3Crect width="640" height="480" fill="%23f2f3f1"/%3E%3Cpath d="M220 150h200v180H220z" fill="none" stroke="%2371776f" stroke-width="14"/%3E%3Ccircle cx="280" cy="210" r="24" fill="%23d2a037"/%3E%3Cpath d="m240 300 65-65 45 45 30-30 40 50" fill="none" stroke="%2371776f" stroke-width="14"/%3E%3C/svg%3E';
  readonly loadingFeatured = signal(true);
  readonly loadingTrend = signal(true);
  readonly featuredError = signal(false);
  readonly promoImage = signal('');
  newsEmail = '';
  private timer?: number;

  constructor() {
    this.load();
    this.heroes.listActive().subscribe({ next: slides => this.slides.set(slides) });
    this.categoryService.getApiCategories().subscribe({ next: categories => this.categories.set(categories.slice(0, 8)) });
    this.timer = window.setInterval(() => this.nextHero(), 7000);
  }

  ngOnDestroy(): void {
    if (this.timer) window.clearInterval(this.timer);
  }

  load(): void {
    this.loadingFeatured.set(true);
    this.featuredError.set(false);
    this.products.getFeatured(8).subscribe({
      next: items => {
        this.featured.set(items);
        this.loadingFeatured.set(false);
      },
      error: () => {
        this.loadingFeatured.set(false);
        this.featuredError.set(true);
      }
    });

    this.loadingTrend.set(true);
    this.products.getTrending(8).subscribe({
      next: items => {
        this.trending.set(items.slice(0, 8));
        this.newReleases.set(items.slice(0, 8));
        this.deals.set(items.filter(item => item.discountPercentage > 0).slice(0, 8));
        this.brands.set([...new Set(items.map(item => item.brand).filter(Boolean))].slice(0, 8));
        this.promoImage.set(items[0]?.thumbnail ?? '');
        this.loadingTrend.set(false);
      },
      error: () => this.loadingTrend.set(false)
    });
  }

  nextHero(): void {
    const n = this.slides().length;
    if (!n) return;
    this.goToHero((this.heroIndex() + 1) % n);
  }

  prevHero(): void {
    const n = this.slides().length;
    if (!n) return;
    this.goToHero((this.heroIndex() - 1 + n) % n);
  }

  goToHero(index: number): void {
    if (index === this.heroIndex()) return;
    this.heroImageFailed.set(false);
    this.heroTransition.update(value => value === 'a' ? 'b' : 'a');
    this.heroIndex.set(index);
  }

  categoryImage(slug: string): string {
    const images: Record<string, string> = {
      'gaming-laptops': '/Imges/laptop-mockup-with-red-background-for-gamers-and-enthusiasts-in-a-high-energy-free-photo.jpg',
      'business-laptops': '/Imges/laptop-mockup-with-artsy-background-for-freelancers-free-photo.jpg',
      'laptops': '/Imges/laptop-mockup-with-artsy-background-for-freelancers-free-photo.jpg',
      'desktop-pcs': '/Imges/background-processor-chip-technology-components-circuit-computer-central-cpu-integrated-background-banner-wallpaper-ai-generated-image_1087980-7110.webp',
      'graphics-cards': '/Imges/3d-video-graphics-card-isolated-transparent-background_191095-16686.avif',
      'processors': '/Imges/background-processor-chip-technology-components-circuit-computer-central-cpu-integrated-background-banner-wallpaper-ai-generated-image_1087980-7110.webp',
      'computer-accessories': '/Imges/computer-accessories-isolated-white-background_621955-44026.webp',
      'gaming-headphones': '/Imges/gaming-headphones-on-laptop-computer-with-bokeh-lights-in-background-technology-and-music-free-photo.jpg'
    };
    return images[slug] ?? '/Imges/computer-accessories-isolated-white-background_621955-44026.webp';
  }

  scrollCategories(direction: 'left' | 'right'): void {
    const track = document.querySelector<HTMLElement>('.home-discovery-grid');
    if (!track) return;
    const distance = track.clientWidth * 0.8;
    track.scrollBy({ left: direction === 'right' ? distance : -distance, behavior: 'smooth' });
  }

  join(event: Event): void {
    event.preventDefault();
    this.toast.show('Subscribed. You’ll hear from us on restocks only.', 'success');
    this.newsEmail = '';
  }

}
