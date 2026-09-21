import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { HeroService, HeroSlide } from '../../core/services/hero.service';
import { CategoryService, StoreApiCategory } from '../../core/services/category.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { ProductSkeletonComponent } from '../../shared/components/product-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ProductCardComponent,
    ProductSkeletonComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="home-hero" aria-roledescription="carousel" aria-label="Featured offers">
      @if (slides().length) {
        <div
          class="home-hero-wrap"
          tabindex="0"
          (mouseenter)="pauseHero()"
          (mouseleave)="resumeHero()"
          (focusin)="pauseHero()"
          (focusout)="resumeHero()"
          (keydown)="onHeroKeydown($event)"
        >
          <div class="home-hero-viewport">
            <div class="home-hero-track" [style.transform]="'translateX(-' + heroIndex() * 100 + '%)'">
              @for (slide of slides(); track slide.id; let i = $index) {
                <a
                  class="home-hero-slide"
                  [routerLink]="slide.cta_destination"
                  [attr.aria-hidden]="i !== heroIndex()"
                  [attr.tabindex]="i === heroIndex() ? 0 : -1"
                  [attr.aria-label]="slide.title"
                >
                  @if (slide.image_url && !heroImageFailed().has(slide.id)) {
                    <img
                      [src]="slide.image_url"
                      [alt]="slide.title"
                      (error)="onHeroImageError(slide.id)"
                      [attr.fetchpriority]="i === 0 ? 'high' : 'lazy'"
                      decoding="async"
                    />
                  } @else {
                    <div class="hero-art" aria-hidden="true">
                      <span>{{ slide.title }}</span>
                      <small>{{ slide.description }}</small>
                    </div>
                  }
                  <span class="home-hero-caption">{{ slide.title }}</span>
                </a>
              }
            </div>
          </div>
          @if (slides().length > 1) {
            <button class="home-hero-arrow previous" type="button" aria-label="Previous slide" (click)="prevHero()">‹</button>
            <button class="home-hero-arrow next" type="button" aria-label="Next slide" (click)="nextHero()">›</button>
            <div class="home-hero-dots">
              @for (s of slides(); track s.id; let i = $index) {
                <button
                  [class.active]="i === heroIndex()"
                  [attr.aria-label]="'Go to slide ' + (i + 1)"
                  [attr.aria-current]="i === heroIndex()"
                  type="button"
                  (click)="goToHero(i)"
                ></button>
              }
            </div>
          }
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
        <div class="product-slider" #trendingTrack>
          @for (p of trending().slice(0, 8); track p.id) { <app-product-card class="product-slide" [product]="p" /> }
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
              <img [src]="categoryImage(category.slug)" [alt]="category.name" width="640" height="480" loading="lazy" decoding="async" />
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
        <div class="product-slider" #releasesTrack>
          @for (p of newReleases().slice(0, 8); track p.id) { <app-product-card class="product-slide" [product]="p" /> }
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

  readonly featured = signal<Product[]>([]);
  readonly trending = signal<Product[]>([]);
  readonly slides = signal<HeroSlide[]>([]);
  readonly categories = signal<StoreApiCategory[]>([]);
  readonly brands = signal<string[]>([]);
  readonly newReleases = signal<Product[]>([]);
  readonly deals = signal<Product[]>([]);
  readonly heroIndex = signal(0);
  readonly heroImageFailed = signal<Set<string>>(new Set());
  readonly loadingFeatured = signal(true);
  readonly loadingTrend = signal(true);
  readonly featuredError = signal(false);
  private heroTimer?: number;

  constructor() {
    this.load();
    this.heroes.listActive().subscribe({ next: slides => this.slides.set(slides) });
    this.categoryService.getApiCategories().subscribe({ next: categories => this.categories.set(categories.slice(0, 8)) });
    this.startHeroAutoplay();
  }

  ngOnDestroy(): void {
    this.stopHeroAutoplay();
  }

  /** Advance to the next slide every 5s, looping back after the last one. */
  private startHeroAutoplay(): void {
    this.stopHeroAutoplay();
    this.heroTimer = window.setInterval(() => this.nextHero(), 5000);
  }

  private stopHeroAutoplay(): void {
    if (this.heroTimer) window.clearInterval(this.heroTimer);
    this.heroTimer = undefined;
  }

  /** Pause while the hero is hovered or focused, then resume on the way out. */
  pauseHero(): void {
    this.stopHeroAutoplay();
  }

  resumeHero(): void {
    if (this.slides().length > 1) this.startHeroAutoplay();
  }

  /** Left/right arrow keys move between slides when the hero has focus. */
  onHeroKeydown(event: KeyboardEvent): void {
    if (this.slides().length < 2) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextHero();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prevHero();
    }
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
        this.brands.set([...new Set(items.map(item => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
        this.loadingTrend.set(false);
      },
      error: () => this.loadingTrend.set(false)
    });
  }

  nextHero(): void {
    const n = this.slides().length;
    if (n < 2) return;
    this.goToHero((this.heroIndex() + 1) % n);
  }

  prevHero(): void {
    const n = this.slides().length;
    if (n < 2) return;
    this.goToHero((this.heroIndex() - 1 + n) % n);
  }

  goToHero(index: number): void {
    if (index === this.heroIndex()) return;
    this.heroIndex.set(index);
  }

  onHeroImageError(id: string): void {
    this.heroImageFailed.update(current => new Set(current).add(id));
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

}
