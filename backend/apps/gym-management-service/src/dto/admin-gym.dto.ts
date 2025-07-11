export interface AdminGymDto {
  id: string;
  name: string;
  uniqueCode: string;
  isActive: boolean;
  createdAt: Date;
  deletedAt?: Date | null;
}
