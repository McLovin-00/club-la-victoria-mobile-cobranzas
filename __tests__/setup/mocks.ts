import type {
  CobradorActivo,
  BindingData,
} from "../../lib/api";
import type { GrupoFamiliar, SocioConGrupo } from "../../lib/types";

export function createCobrador(overrides: Partial<CobradorActivo> = {}): CobradorActivo {
  return {
    id: 1,
    nombre: "Ana Perez",
    activo: true,
    ...overrides,
  };
}

export function createBinding(overrides: Partial<BindingData> = {}): BindingData {
  return {
    installationId: "device-123",
    cobradorId: 1,
    cobradorNombre: "Ana Perez",
    ...overrides,
  };
}

export function createGrupo(overrides: Partial<GrupoFamiliar> = {}): GrupoFamiliar {
  return {
    id: 10,
    nombre: "Familia Perez",
    descripcion: "Grupo principal",
    orden: 1,
    cantidadMiembros: 4,
    miembrosConDeuda: 2,
    totalPendiente: 23000,
    ...overrides,
  };
}

export function createSocio(overrides: Partial<SocioConGrupo> = {}): SocioConGrupo {
  return {
    id: 11,
    nombre: "Juan",
    apellido: "Perez",
    estado: "CON_DEUDA",
    dni: "30111222",
    cantidadCuotasPendientes: 2,
    grupoFamiliar: {
      id: 10,
      nombre: "Familia Perez",
    },
    ...overrides,
  };
}
