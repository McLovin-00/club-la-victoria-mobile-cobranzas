import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { showToast } from '../components/ui/Toast.utils';
import {
  useGetResolverConfigsQuery,
  useUpdateResolverConfigMutation,
} from '../features/helpdesk/api/helpdeskApi';
import type {
  ResolverConfig,
  TicketCategory,
  UpdateResolverConfigPayload,
} from '../features/helpdesk/types';

const CATEGORY_ORDER: TicketCategory[] = ['TECHNICAL', 'OPERATIONAL'];

const CATEGORY_META: Record<TicketCategory, { title: string; description: string }> = {
  TECHNICAL: {
    title: 'Soporte técnico',
    description: 'Errores, dudas funcionales, sugerencias y reglas de negocio.',
  },
  OPERATIONAL: {
    title: 'Soporte operativo',
    description: 'Gestiones operativas, seguimiento y consultas no técnicas.',
  },
};

function createEmptyDraft(): UpdateResolverConfigPayload {
  return {
    telegramGroupId: '',
    telegramGroupName: '',
    resolverNames: [],
    isActive: true,
  };
}

function buildDrafts(configs?: ResolverConfig[]): Record<TicketCategory, UpdateResolverConfigPayload> {
  return CATEGORY_ORDER.reduce(
    (acc, category) => {
      const current = configs?.find(config => config.category === category);
      acc[category] = current
        ? {
            telegramGroupId: current.telegramGroupId ?? '',
            telegramGroupName: current.telegramGroupName ?? '',
            resolverNames: current.resolverNames ?? [],
            isActive: current.isActive ?? true,
          }
        : createEmptyDraft();
      return acc;
    },
    {} as Record<TicketCategory, UpdateResolverConfigPayload>
  );
}

export const AdminHelpdeskPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: resolverConfigs, isLoading: isLoadingResolverConfigs } = useGetResolverConfigsQuery();
  const [updateResolverConfig, { isLoading: isSavingConfig }] = useUpdateResolverConfigMutation();
  const [drafts, setDrafts] = React.useState<Record<TicketCategory, UpdateResolverConfigPayload>>(() =>
    buildDrafts()
  );
  const resolverConfigSignature = React.useMemo(() => JSON.stringify(resolverConfigs ?? []), [resolverConfigs]);

  React.useEffect(() => {
    const nextDrafts = buildDrafts(resolverConfigs);
    setDrafts(current =>
      JSON.stringify(current) === JSON.stringify(nextDrafts) ? current : nextDrafts
    );
  }, [resolverConfigs, resolverConfigSignature]);

  const configCards = React.useMemo(
    () =>
      CATEGORY_ORDER.map(category => ({
        category,
        meta: CATEGORY_META[category],
        draft: drafts[category] ?? createEmptyDraft(),
      })),
    [drafts]
  );

  const handleDraftChange = <K extends keyof UpdateResolverConfigPayload>(
    category: TicketCategory,
    key: K,
    value: UpdateResolverConfigPayload[K]
  ) => {
    setDrafts(current => ({
      ...current,
      [category]: {
        ...current[category],
        [key]: value,
      },
    }));
  };

  const handleSave = async (category: TicketCategory) => {
    const draft = drafts[category];
    const telegramGroupId = draft.telegramGroupId.trim();

    if (!telegramGroupId) {
      showToast('El ID del grupo de Telegram es obligatorio.', 'error');
      return;
    }

    try {
      await updateResolverConfig({
        category,
        payload: {
          telegramGroupId,
          telegramGroupName: draft.telegramGroupName?.trim() || '',
          resolverNames: draft.resolverNames.map(name => name.trim()).filter(Boolean),
          isActive: draft.isActive,
        },
      }).unwrap();

      showToast(`Configuración de ${CATEGORY_META[category].title} guardada.`, 'success');
    } catch (error: any) {
      showToast(error?.data?.message || 'No se pudo guardar la configuración.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/helpdesk')}
              className="p-1.5 -ml-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Volver a Mesa de Ayuda"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Configuración de Telegram</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Asigná grupos y resolvers por categoría de soporte.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Config cards */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {configCards.map(({ category, meta, draft }) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{meta.title}</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">ID grupo Telegram</label>
                <input
                  value={draft.telegramGroupId}
                  onChange={event => handleDraftChange(category, 'telegramGroupId', event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="-1001234567890"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Nombre del grupo</label>
                <input
                  value={draft.telegramGroupName ?? ''}
                  onChange={event => handleDraftChange(category, 'telegramGroupName', event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Soporte técnico"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Resolvers</label>
                <textarea
                  value={draft.resolverNames.join(', ')}
                  onChange={event =>
                    handleDraftChange(
                      category,
                      'resolverNames',
                      event.target.value
                        .split(',')
                        .map(name => name.trim())
                        .filter(Boolean)
                    )
                  }
                  className="min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Ada Lovelace, Grace Hopper"
                />
                <p className="text-xs text-muted-foreground">
                  Separalos por coma para mantener la lista de resolvers de referencia.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Configuración activa</p>
                  <p className="text-xs text-muted-foreground">Si la desactivás, la categoría deja de usarse para routing.</p>
                </div>
                <select
                  value={String(draft.isActive)}
                  onChange={event => handleDraftChange(category, 'isActive', event.target.value === 'true')}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={isSavingConfig || isLoadingResolverConfigs}
                onClick={() => void handleSave(category)}
              >
                {isSavingConfig ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Guardando...
                  </span>
                ) : (
                  `Guardar ${meta.title}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default AdminHelpdeskPage;
