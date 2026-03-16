import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetEmpresaTransportistaChoferesQuery, useGetEmpresaTransportistaEquiposQuery, useGetEmpresasTransportistasQuery } from '../api/documentosApiSlice';

export default function EmpresaTransportistaDetailPage() {
  const { id } = useParams();
  const empresaId = Number(id);
  const { data: empresas } = useGetEmpresasTransportistasQuery({});
  const empresa = useMemo(() => (Array.isArray(empresas) ? empresas.find((e: any) => e.id === empresaId) : null), [empresas, empresaId]);
  const { data: choferes } = useGetEmpresaTransportistaChoferesQuery({ id: empresaId }, { skip: !empresaId });
  const { data: equipos } = useGetEmpresaTransportistaEquiposQuery({ id: empresaId }, { skip: !empresaId });

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            className="inline-flex items-center gap-2 border border-border text-muted-foreground hover:bg-accent font-medium px-4 py-2 rounded-lg transition-all duration-200"
            to="/documentos/empresas-transportistas"
          >
            ← Atrás
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Empresa #{empresaId}</h1>
            <p className="text-muted-foreground">{empresa?.razonSocial ?? '—'} · CUIT {empresa?.cuit ?? '—'}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-lg font-semibold mb-2">Choferes</div>
          <div className="space-y-2">
            {(Array.isArray(choferes) ? choferes : []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <div className="font-medium">{c.apellido ? `${c.apellido}, ${c.nombre}` : c.dni}</div>
                  <div className="text-xs text-muted-foreground">DNI {c.dni} · {c.activo ? 'Activo' : 'Inactivo'}</div>
                </div>
              </div>
            ))}
            {(!choferes || (Array.isArray(choferes) && choferes.length === 0)) && <div className="text-sm text-muted-foreground">Sin choferes</div>}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-lg font-semibold mb-2">Equipos</div>
          <div className="space-y-2">
            {(Array.isArray(equipos) ? equipos : []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <div className="font-medium">Equipo #{e.id}</div>
                  <div className="text-xs text-muted-foreground">DNI {e.driverDniNorm} · {e.truckPlateNorm} · {e.trailerPlateNorm || '-'}</div>
                </div>
              </div>
            ))}
            {(!equipos || (Array.isArray(equipos) && equipos.length === 0)) && <div className="text-sm text-muted-foreground">Sin equipos</div>}
          </div>
        </div>
      </section>
    </div>
  );
}


