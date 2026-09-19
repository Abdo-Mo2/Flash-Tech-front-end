import { Pipe, PipeTransform } from '@angular/core';
import { salePrice } from '../../core/mappers/product.mapper';
import { environment } from '../../../environments/environment';

@Pipe({ name: 'saleEgp', standalone: true })
export class SaleEgpPipe implements PipeTransform {
  transform(product: { price: number; discountPercentage: number } | null | undefined): number {
    if (!product) return 0;
    return salePrice(product) * environment.egpMultiplier;
  }
}

@Pipe({ name: 'listEgp', standalone: true })
export class ListEgpPipe implements PipeTransform {
  transform(product: { price: number } | null | undefined): number {
    if (!product) return 0;
    return product.price * environment.egpMultiplier;
  }
}
