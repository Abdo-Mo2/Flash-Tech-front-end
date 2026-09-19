export interface CartItem {
  productId: string;
  title: string;
  brand: string;
  thumbnail: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export interface WishlistItem {
  productId: string;
  title: string;
  brand: string;
  thumbnail: string;
  unitPrice: number;
  stock: number;
}
