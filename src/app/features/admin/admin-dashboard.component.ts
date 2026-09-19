import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { AdminStats } from '../../core/models/admin.model';
import { EgpPipe } from '../../shared/pipes/egp.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, EgpPipe],
  template: `
    <div class="mb-7 flex justify-between"><div><p class="mb-1 text-xs font-bold uppercase text-[var(--amber-700)]">Overview</p><h1 class="font-['Space_Grotesk'] text-[30px] font-bold">Dashboard</h1></div></div>
    @if (error()) { <div class="mb-4 rounded-md bg-[var(--red-100)] px-4 py-3 text-[var(--red)]" role="alert">{{ error() }}</div> }
    @if (loading()) { <div class="text-[var(--text-2)]">Loading live metrics…</div> } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div class="flex min-h-[132px] flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5"><span class="text-[13px] text-[var(--text-2)]">Total products</span><strong class="mt-2.5 block font-['Space_Grotesk'] text-[28px] font-bold text-[var(--ink)]">{{ stats().products }}</strong></div>
        <div class="flex min-h-[132px] flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5"><span class="text-[13px] text-[var(--text-2)]">Total orders</span><strong class="mt-2.5 block font-['Space_Grotesk'] text-[28px] font-bold text-[var(--ink)]">{{ stats().orders }}</strong></div>
        <div class="flex min-h-[132px] flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5"><span class="text-[13px] text-[var(--text-2)]">Processing</span><strong class="mt-2.5 block font-['Space_Grotesk'] text-[28px] font-bold text-[var(--ink)]">{{ stats().processing }}</strong></div>
        <div class="flex min-h-[132px] flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5"><span class="text-[13px] text-[var(--text-2)]">Delivered</span><strong class="mt-2.5 block font-['Space_Grotesk'] text-[28px] font-bold text-[var(--ink)]">{{ stats().delivered }}</strong></div>
        <div class="flex min-h-[132px] flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5"><span class="text-[13px] text-[var(--text-2)]">Revenue (delivered)</span><strong class="mt-2.5 block font-['Space_Grotesk'] text-[28px] font-bold text-[var(--ink)]">{{ stats().revenue | egp }}</strong></div>
      </div>
      <div class="admin-dashboard-grid">
        <section class="admin-panel"><div class="admin-panel-heading"><div><span class="section-eyebrow">Sales history</span><h2>Monthly sales</h2></div><span class="admin-kpi-note">{{ stats().monthlySales.length }} months</span></div><div class="sales-history">@for (month of stats().monthlySales; track month.month_start) { <div class="sales-history-row"><span>{{ month.month_start | date:'MMM yyyy' }}</span><strong>{{ month.delivered_revenue | egp }}</strong><small>{{ month.delivered_orders }} delivered orders</small></div> } @empty { <p class="hint">Delivered orders will appear here after the history migration is applied.</p> }</div></section>
        <section class="admin-panel"><div class="admin-panel-heading"><div><span class="section-eyebrow">Operations</span><h2>Store health</h2></div></div><div class="admin-health-list"><p><span>Low stock items</span><strong>{{ stats().lowStock }}</strong></p><p><span>Customers</span><strong>{{ stats().users }}</strong></p><p><span>Shipped</span><strong>{{ stats().shipped }}</strong></p><p><span>Out for delivery</span><strong>{{ stats().outForDelivery }}</strong></p><p><span>Cancelled</span><strong>{{ stats().cancelled }}</strong></p></div></section>
      </div>
    }
  `
})
export class AdminDashboardComponent {
  private readonly admin = inject(AdminService);
  readonly loading = signal(true); readonly error = signal('');
  readonly stats = signal<AdminStats>({ products: 0, orders: 0, processing: 0, shipped: 0, outForDelivery: 0, delivered: 0, cancelled: 0, lowStock: 0, users: 0, revenue: 0, monthlySales: [] });
  constructor() { this.admin.getStats().subscribe({ next: value => { this.stats.set(value); this.loading.set(false); }, error: error => { this.error.set(error.message || 'Could not load dashboard metrics.'); this.loading.set(false); } }); }
}
