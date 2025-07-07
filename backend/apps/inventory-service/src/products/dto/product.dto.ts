// expone SOLO lo necesario al cliente
export class ProductDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  barcode: string;
  gymId: string;
  createdAt: Date;
  updatedAt: Date;
  
  constructor(partial: Partial<ProductDto>) {
    Object.assign(this, partial);
  }
}
