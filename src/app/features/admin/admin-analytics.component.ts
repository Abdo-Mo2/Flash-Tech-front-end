import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AdminStats, MonthlySales } from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [DatePipe, DecimalPipe, EgpPipe],
  template: `
    <div class="analytics-heading"><div><p>Store performance</p><h1>Analytics</h1></div><span>Delivered orders only</span></div>
    @if (loading()) { <p class="hint">Loading analytics…</p> }
    @if (error()) { <div class="admin-error">{{ error() }}</div> }
    @if (stats(); as data) {
      <section class="analytics-kpis">
        <article><small>Revenue</small><strong>{{ data.revenue | egp }}</strong><span>Delivered only</span></article>
        <article><small>Delivered orders</small><strong>{{ data.delivered }}</strong><span>Current order data</span></article>
        <article><small>Average order value</small><strong>{{ average(data) | egp }}</strong><span>Delivered only</span></article>
        <article><small>Cancellation rate</small><strong>{{ cancellationRate(data) | number:'1.1-1' }}%</strong><span>All recorded orders</span></article>
      </section>
      <section class="analytics-panel">
        <div><h2>Revenue Trend</h2><p>Delivered-order revenue, recent months</p></div>
        <div class="analytics-bars" aria-label="Revenue trend">
          @for (month of chartMonths(data.monthlySales); track month.month_start) {
            <div><span [style.height.%]="barHeight(month, data.monthlySales)"></span><small>{{ month.month_start | date:'MMM' }}</small></div>
          }
        </div>
      </section>
      <section class="analytics-panel analytics-table"><div><h2>Monthly Performance History</h2><p>Archived at month close — never overwritten</p></div>
        <table><thead><tr><th>Month</th><th>Delivered orders</th><th>Revenue</th><th>Average order value</th></tr></thead><tbody>
          @for (month of data.monthlySales; track month.month_start) { <tr><td>{{ month.month_start | date:'MMMM y' }}</td><td>{{ month.delivered_orders }}</td><td>{{ month.delivered_revenue | egp }}</td><td>{{ averageMonth(month) | egp }}</td></tr> }
          @empty { <tr><td colspan="4">No completed monthly sales periods yet.</td></tr> }
        </tbody></table>
      </section>
    }
  `
})
export class AdminAnalyticsComponent {
  private readonly admin = inject(AdminService);
  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() { this.admin.getStats().subscribe({ next: data => { this.stats.set(data); this.loading.set(false); }, error: error => { this.error.set(error.message || 'Could not load analytics.'); this.loading.set(false); } }); }
  average(data: AdminStats): number { return data.delivered ? data.revenue / data.delivered : 0; }
  averageMonth(month: MonthlySales): number { return month.delivered_orders ? Number(month.delivered_revenue) / month.delivered_orders : 0; }
  cancellationRate(data: AdminStats): number { return data.orders ? data.cancelled / data.orders * 100 : 0; }
  chartMonths(months: MonthlySales[]): MonthlySales[] { return [...months].reverse(); }
  barHeight(month: MonthlySales, months: MonthlySales[]): number { const max = Math.max(...months.map(item => Number(item.delivered_revenue)), 1); return Math.max(8, Number(month.delivered_revenue) / max * 100); }
}
