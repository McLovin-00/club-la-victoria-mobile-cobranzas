
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/providers/theme-provider';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/confirm-dialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { RequireAuth } from './features/auth/components/RequireAuth';
import { RequirePasswordChange } from './features/auth/components/RequirePasswordChange';
import DashboardPage from './pages/DashboardPage';
import UsuariosPageLazy from './pages/UsuariosPage.lazy';
import EmpresasPageLazy from './features/empresas/pages/EmpresasPage.lazy';
// Eliminado: Instancias, Gateway y Chat Processor
import PlatformUsersPageLazy from './pages/PlatformUsersPage.lazy';
import EndUsersPageLazy from './pages/EndUsersPage.lazy';
// Eliminado: WizardV2 (Chat Processor)

import { DocumentosPage } from './features/documentos/pages/DocumentosPage';
import { DocumentosMainPage } from './features/documentos/pages/DocumentosMainPage';
import { TemplatesPage } from './features/documentos/pages/TemplatesPage';
import { FlowiseConfigPage } from './features/documentos/pages/FlowiseConfigPage';
import EvolutionConfigPage from './features/documentos/pages/EvolutionConfigPage';
import NotificationsConfigPage from './features/documentos/pages/NotificationsConfigPage';
import AuditLogsPage from './features/documentos/pages/AuditLogsPage';
import DashboardDadoresPage from './features/documentos/pages/DashboardDadoresPage';
import ClientsPage from './features/documentos/pages/ClientsPage';
import ClientRequirementsPage from './features/documentos/pages/ClientRequirementsPage';
import PlantillasRequisitoPage from './features/documentos/pages/PlantillasRequisitoPage';
import EquiposPage from './features/documentos/pages/EquiposPage';
import ConsultaPage from './features/documentos/pages/ConsultaPage';
import DadoresPage from './features/documentos/pages/DadoresPage';
import ApprovalQueuePage from './features/documentos/pages/ApprovalQueuePage';
import ApprovalDetailPage from './features/documentos/pages/ApprovalDetailPage';
import ExtractedDataPage from './features/documentos/pages/ExtractedDataPage';
import EmpresasTransportistasPage from './features/documentos/pages/EmpresasTransportistasPage';
import EmpresaTransportistaDetailPage from './features/documentos/pages/EmpresaTransportistaDetailPage';
import { RejectedDocumentsPage } from './pages/documentos/RejectedDocumentsPage';
import { NotificationsPage } from './pages/notificaciones/NotificationsPage';
// Eliminado: EmpresasDocPage (no existe)
import ChoferesPage from './features/documentos/pages/ChoferesPage';
import CamionesPage from './features/documentos/pages/CamionesPage';
import AcopladosPage from './features/documentos/pages/AcopladosPage';
import EstadoEquipoPage from './features/documentos/pages/EstadoEquipoPage';
import AltaEquipoCompletaPage from './features/equipos/pages/AltaEquipoCompletaPage';
import EditarEquipoPage from './features/equipos/pages/EditarEquipoPage';
import { PerfilPage } from './pages/PerfilPage';
import { AuthInitializer } from './components/AuthInitializer';
import { ProtectedServiceRoute } from './components/ProtectedServiceRoute';
// Eliminado: Calidad (QMS)
import ClientePortalPage from './pages/ClientePortalPage';
import DadoresPortalPage from './pages/DadoresPortalPage';
import TransportistasPortalPage from './pages/TransportistasPortalPage';
import { AdminInternoPortalPage } from './pages/AdminInternoPortalPage';
import TransferenciasPage from './features/admin/pages/TransferenciasPage';
// Portal Cliente (nuevo - solo lectura)
import ClienteDashboard from './features/cliente/pages/ClienteDashboard';
import ClienteEquipoDetalle from './features/cliente/pages/ClienteEquipoDetalle';
// Portal Transportista
import TransportistaDashboard from './features/transportista/pages/TransportistaDashboard';
// Portal Dador de Carga
import DadorDashboard from './features/dador/pages/DadorDashboard';
// Portal Chofer
import ChoferDashboard from './features/chofer/pages/ChoferDashboard';
// Remitos
import { RemitosPage } from './features/remitos/pages/RemitosPage';

function App() {
  return (
    <ThemeProvider defaultTheme='light' storageKey='empresas-app-theme'>
      <ErrorBoundary>
      <AuthInitializer>
      <ToastProvider>
      <ConfirmProvider>
        <Routes>
          {/* Rutas Públicas */}
          <Route path='/login' element={<LoginPage />} />

          {/* Rutas Protegidas anidadas dentro de MainLayout */}
          <Route element={<MainLayout />}>
            <Route element={<RequireAuth />}>
              <Route element={<RequirePasswordChange />}>
              {/* Ruta raíz ahora redirige al DashboardPage que maneja la redirección por rol */}
              <Route path='/' element={<DashboardPage />} />
              
              {/* Dashboard explícito para SUPERADMIN y ADMIN */}
              <Route path='/dashboard' element={<DashboardPage />} />

              {/* Rutas de gestión de usuarios - para roles que pueden crear/editar usuarios */}
              <Route element={<RequireAuth allowedRoles={['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']} />}>
                <Route path='/platform-users' element={<PlatformUsersPageLazy />} />
              </Route>

              {/* Rutas solo para admin y superadmin */}
              <Route element={<RequireAuth allowedRoles={['ADMIN', 'SUPERADMIN']} />}>
                <Route path='/end-users' element={<EndUsersPageLazy />} />
              </Route>

              {/* Rutas para superadmin */}
              <Route element={<RequireAuth allowedRoles={['SUPERADMIN']} />}>
                {/* Eliminado: Calidad (QMS) */}
                <Route path='/empresas' element={<EmpresasPageLazy />} />
              </Route>

              {/* Rutas de Documentos para todos los roles que usan el sistema */}
              <Route element={<RequireAuth allowedRoles={['SUPERADMIN', 'ADMIN', 'OPERATOR', 'ADMIN_INTERNO', 'OPERADOR_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER']} />}>
                <Route path='/documentos' element={
                  <ProtectedServiceRoute service="documentos">
                    <DocumentosMainPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/auditoria' element={
                  <ProtectedServiceRoute service="documentos">
                    <AuditLogsPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/clientes' element={
                  <ProtectedServiceRoute service="documentos">
                    <ClientsPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/clientes/:clienteId/requirements' element={
                  <ProtectedServiceRoute service="documentos">
                    <ClientRequirementsPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/plantillas' element={
                  <ProtectedServiceRoute service="documentos">
                    <PlantillasRequisitoPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/plantillas/:clienteId' element={
                  <ProtectedServiceRoute service="documentos">
                    <PlantillasRequisitoPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/equipos' element={
                  <ProtectedServiceRoute service="documentos">
                    <EquiposPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/equipos/alta-completa' element={
                  <ProtectedServiceRoute service="documentos">
                    <AltaEquipoCompletaPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/equipos/:id/estado' element={
                  <ProtectedServiceRoute service="documentos">
                    <EstadoEquipoPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/equipos/:id/editar' element={
                  <ProtectedServiceRoute service="documentos">
                    <EditarEquipoPage />
                  </ProtectedServiceRoute>
                } />
                 {/* Eliminado: Empresas (Documentos) */}
                <Route path='/documentos/choferes' element={
                  <ProtectedServiceRoute service="documentos">
                    <ChoferesPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/camiones' element={
                  <ProtectedServiceRoute service="documentos">
                    <CamionesPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/acoplados' element={
                  <ProtectedServiceRoute service="documentos">
                    <AcopladosPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/dadores' element={
                  <ProtectedServiceRoute service="documentos">
                    <DadoresPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/consulta' element={
                  <ProtectedServiceRoute service="documentos">
                    <ConsultaPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/plantillas' element={
                  <ProtectedServiceRoute service="documentos">
                    <TemplatesPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/configuracion/flowise' element={
                  <ProtectedServiceRoute service="documentos">
                    <FlowiseConfigPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/configuracion/evolution' element={
                  <ProtectedServiceRoute service="documentos">
                    <EvolutionConfigPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/configuracion/notificaciones' element={
                  <ProtectedServiceRoute service="documentos">
                    <NotificationsConfigPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/dashboard' element={
                  <ProtectedServiceRoute service="documentos">
                    <DashboardDadoresPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/rechazados' element={
                  <ProtectedServiceRoute service="documentos">
                    <RejectedDocumentsPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/notificaciones' element={
                  <ProtectedServiceRoute service="documentos">
                    <NotificationsPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/empresas-transportistas' element={
                  <ProtectedServiceRoute service="documentos">
                    <EmpresasTransportistasPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/empresas-transportistas/:id' element={
                  <ProtectedServiceRoute service="documentos">
                    <EmpresaTransportistaDetailPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/aprobacion' element={
                  <ProtectedServiceRoute service="documentos">
                    <ApprovalQueuePage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/aprobacion/:id' element={
                  <ProtectedServiceRoute service="documentos">
                    <ApprovalDetailPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/documentos/datos-extraidos' element={
                  <ProtectedServiceRoute service="documentos">
                    <ExtractedDataPage />
                  </ProtectedServiceRoute>
                } />
                <Route path='/dadores/:empresaId/documentos' element={
                  <ProtectedServiceRoute service="documentos">
                    <DocumentosPage />
                  </ProtectedServiceRoute>
                } />
              </Route>

              {/* Portales */}
              <Route element={<RequireAuth allowedRoles={['CLIENTE_TRANSPORTE','ADMIN','SUPERADMIN']} />}> 
                <Route path='/portal/cliente' element={<ClientePortalPage />} />
              </Route>
              <Route element={<RequireAuth allowedRoles={['ADMIN','SUPERADMIN']} />}> 
                <Route path='/portal/dadores' element={<DadoresPortalPage />} />
              </Route>
              <Route element={<RequireAuth allowedRoles={['ADMIN','SUPERADMIN']} />}> 
                <Route path='/portal/transportistas' element={<TransportistasPortalPage />} />
              </Route>

              {/* Portal de Admin Interno */}
              <Route element={<RequireAuth allowedRoles={['ADMIN_INTERNO', 'ADMIN', 'SUPERADMIN']} />}> 
                <Route path='/portal/admin-interno' element={<AdminInternoPortalPage />} />
                <Route path='/admin/transferencias' element={<TransferenciasPage />} />
              </Route>

              {/* Portal Cliente (nuevo - solo lectura con endpoints dedicados) */}
              <Route element={<RequireAuth allowedRoles={['CLIENTE', 'CLIENTE_TRANSPORTE', 'ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO']} />}> 
                <Route path='/cliente' element={<ClienteDashboard />} />
                <Route path='/cliente/equipos/:id' element={<ClienteEquipoDetalle />} />
              </Route>

              {/* Portal Transportista */}
              <Route element={<RequireAuth allowedRoles={['TRANSPORTISTA', 'EMPRESA_TRANSPORTISTA', 'CHOFER', 'ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA']} />}> 
                <Route path='/transportista' element={<TransportistaDashboard />} />
              </Route>

              {/* Portal Dador de Carga */}
              <Route element={<RequireAuth allowedRoles={['DADOR_DE_CARGA', 'ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO']} />}> 
                <Route path='/dador' element={<DadorDashboard />} />
              </Route>

              {/* Portal Chofer */}
              <Route element={<RequireAuth allowedRoles={['CHOFER', 'ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']} />}> 
                <Route path='/chofer' element={<ChoferDashboard />} />
              </Route>

              {/* Remitos - Roles que pueden subir y ver */}
              <Route element={<RequireAuth allowedRoles={['SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER']} />}> 
                <Route path='/remitos' element={<RemitosPage />} />
              </Route>

              {/* Ruta de Mi Perfil para todos los usuarios */}
              <Route path='/perfil' element={<PerfilPage />} />
              </Route>
            </Route>
          </Route>

          {/* Ruta Catch-all */}
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </ConfirmProvider>
      </ToastProvider>
      </AuthInitializer>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
