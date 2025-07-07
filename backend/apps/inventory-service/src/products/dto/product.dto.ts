// expone SOLO lo necesario al cliente
export class ProductDto {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  barcode: string;
  gymId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  
  constructor(partial: any) {
    Object.assign(this, partial);
    // Convertir null a undefined para el frontend
    if (this.description === null) {
      this.description = undefined;
    }
  }
}
