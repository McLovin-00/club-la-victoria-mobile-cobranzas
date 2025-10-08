export interface Empresa {
  id: number;
  nombre: string;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmpresaCreateInput {
  nombre: string;
  descripcion?: string;
}

export interface EmpresaUpdateInput {
  nombre?: string;
  descripcion?: string;
}
