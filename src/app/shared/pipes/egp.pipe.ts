import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({ name: 'egp', standalone: true })
export class EgpPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    const rounded = Math.round(value);
    return `${rounded.toLocaleString('en-EG')} ${environment.currencyCode}`;
  }
}
