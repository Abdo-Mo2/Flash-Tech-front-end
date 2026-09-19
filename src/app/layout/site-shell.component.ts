import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';
import { ToastHostComponent } from '../shared/components/toast-host.component';

@Component({
  selector: 'app-site-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastHostComponent],
  template: `
    <div class="app-shell">
      <a class="skip-link" href="#main">Skip to content</a>
      <app-header />
      <main id="main">
        <router-outlet />
      </main>
      <app-footer />
      <app-toast-host />
    </div>
  `
})
export class SiteShellComponent {}
