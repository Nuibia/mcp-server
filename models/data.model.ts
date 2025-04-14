export interface Data {
  id: string;
  name: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDataDto {
  name: string;
  value: any;
}

export interface UpdateDataDto {
  name?: string;
  value?: any;
} 