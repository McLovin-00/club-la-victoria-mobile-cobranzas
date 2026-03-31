/**
 * Pantalla de creación de ticket con diseño inmersivo.
 * Layout tipo "workspace" con pasos claros y preview en tiempo real.
 */

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useCreateTicketMutation } from '@/features/helpdesk/api/helpdeskApi';
import { HelpdeskMessageComposer } from '@/features/helpdesk/components/HelpdeskMessageComposer';
import type {
  CreateTicketPayload,
  TicketCategory,
  TicketPriority,
  TicketSubcategory,
} from '@/features/helpdesk/types';
import { useHelpdeskVoiceNote } from '@/features/helpdesk/hooks/useHelpdeskVoiceNote';
import { Logger } from '@/lib/utils';

const SUBCATEGORY_CONFIG: Record<TicketSubcategory, { label: string; emoji: string }> = {
  ERROR: { label: 'Error', emoji: '🐛' },
  DOUBT: { label: 'Duda', emoji: '❓' },
  SUGGESTION: { label: 'Sugerencia', emoji: '💡' },
  BUSINESS_RULE: { label: 'Regla', emoji: '📋' },
};

const CATEGORY_CONFIG: Record<TicketCategory, { label: string; emoji: string; description: string; color: string }> = {
  OPERATIONAL: {
    label: 'Operativa',
    emoji: '⚙️',
    description: 'Procesos, políticas, consultas generales',
    color: 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/20',
  },
  TECHNICAL: {
    label: 'Técnica',
    emoji: '🔧',
    description: 'Errores, bugs, problemas del sistema',
    color: 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20',
  },
};

const MIN_SUBJECT = 5;
const MIN_MESSAGE = 10;

// Chip selector component
const ChipGroup: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  variant?: 'default' | 'accent';
}> = ({ options, value, onChange, label, variant = 'default' }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all
            ${value === opt.value
              ? variant === 'accent'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-foreground text-background border-foreground'
              : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

// Category card — primary visual element
const CategoryCard: React.FC<{
  category: TicketCategory;
  isSelected: boolean;
  onClick: () => void;
}> = ({ category, isSelected, onClick }) => {
  const config = CATEGORY_CONFIG[category];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all
        ${isSelected
          ? `${config.color} border-primary ring-2 ring-primary/20 shadow-sm`
          : 'bg-transparent border-border hover:border-muted-foreground/50 hover:bg-muted/30'
        }`}
    >
      <span className="text-xl leading-none mt-0.5">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
          {config.label}
        </div>
        <div className="text-xs text-muted-foreground/70 mt-0.5">{config.description}</div>
      </div>
      {isSelected && (
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
      )}
    </button>
  );
};

// Progress indicator
const FormProgress: React.FC<{ subject: string; message: string; hasFiles: boolean }> = ({ subject, message, hasFiles }) => {
  const hasSubject = subject.trim().length >= MIN_SUBJECT;
  const hasContent = message.trim().length >= MIN_MESSAGE || hasFiles;

  const steps = [
    { done: hasSubject, label: 'Asunto' },
    { done: hasContent, label: 'Contenido' },
  ];

  const completed = steps.filter(s => s.done).length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`w-6 h-1 rounded-full transition-colors ${step.done ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {completed}/{steps.length}
      </span>
    </div>
  );
};

export const HelpdeskNewTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<TicketCategory>('OPERATIONAL');
  const [subcategory, setSubcategory] = useState<TicketSubcategory>('DOUBT');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [subject, setSubject] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState('');
  const [createTicket, { isLoading }] = useCreateTicketMutation();

  const addFiles = useCallback((list: FileList | File[]) => {
    const next = Array.from(list).slice(0, 8);
    setPendingFiles(prev => [...prev, ...next].slice(0, 8));
  }, []);

  const { isRecording, recordingError, toggleRecording } = useHelpdeskVoiceNote(file => addFiles([file]));

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const subj = subject.trim().slice(0, 200);
    const msg = draftMessage.trim().slice(0, 5000);

    if (subj.length < MIN_SUBJECT) {
      setFormError(`El asunto debe tener al menos ${MIN_SUBJECT} caracteres.`);
      return;
    }
    if (pendingFiles.length === 0 && msg.length < MIN_MESSAGE) {
      setFormError(`Escribí al menos ${MIN_MESSAGE} caracteres o adjuntá / grabá un archivo.`);
      return;
    }

    const payload: CreateTicketPayload = {
      category,
      subcategory,
      subject: subj,
      priority,
      message: msg,
    };

    try {
      const ticket = await createTicket({
        payload,
        files: pendingFiles.length > 0 ? pendingFiles : undefined,
      }).unwrap();
      navigate(`/helpdesk/${ticket.id}`);
    } catch (err) {
      Logger.error('Error creando ticket', err);
      setFormError('No se pudo crear el ticket. Revisá los datos o intentá de nuevo.');
    }
  };

  const priorityOptions = [
    { value: 'LOW', label: 'Baja' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'Alta' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/helpdesk')}
                className="p-1.5 -ml-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Volver"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">Nuevo ticket</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Creá una solicitud de soporte</p>
              </div>
            </div>
            <FormProgress subject={subject} message={draftMessage} hasFiles={pendingFiles.length > 0} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Subject input - prominent */}
          <div className="space-y-1.5">
            <label htmlFor="nt-subject" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Asunto <span className="text-destructive">*</span>
            </label>
            <input
              id="nt-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              className="w-full px-0 py-2 text-lg sm:text-xl font-medium bg-transparent border-0 border-b-2 border-border focus:border-primary focus:ring-0 focus:outline-none placeholder:text-muted-foreground/40 transition-colors"
              placeholder="¿En qué podemos ayudarte?"
              autoComplete="off"
              autoFocus
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{subject.trim().length < MIN_SUBJECT ? `Mínimo ${MIN_SUBJECT} caracteres` : '✓ Listo'}</span>
              <span className="font-mono">{subject.length}/200</span>
            </div>
          </div>

          {/* Category — prominent cards */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Categoría
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['OPERATIONAL', 'TECHNICAL'] as TicketCategory[]).map((cat) => (
                <CategoryCard
                  key={cat}
                  category={cat}
                  isSelected={category === cat}
                  onClick={() => setCategory(cat)}
                />
              ))}
            </div>
          </div>

          {/* Subcategory + Priority — inline chips */}
          <div className="flex flex-col sm:flex-row gap-4">
            <ChipGroup
              label="Tipo de solicitud"
              options={(Object.keys(SUBCATEGORY_CONFIG) as TicketSubcategory[]).map((sub) => ({
                value: sub,
                label: `${SUBCATEGORY_CONFIG[sub].emoji} ${SUBCATEGORY_CONFIG[sub].label}`,
              }))}
              value={subcategory}
              onChange={(v) => setSubcategory(v as TicketSubcategory)}
            />
            <ChipGroup
              label="Prioridad"
              options={priorityOptions}
              value={priority}
              onChange={(v) => setPriority(v as TicketPriority)}
              variant="accent"
            />
          </div>

          {/* Message preview */}
          {draftMessage.trim() ? (
            <div className="pt-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Vista previa del mensaje
              </div>
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-sm whitespace-pre-wrap shadow-sm">
                  {draftMessage.trim()}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Escribí tu mensaje abajo. Podés adjuntar archivos o grabar audio.
              </p>
            </div>
          )}

          {/* Error message */}
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </div>
      </main>

      {/* Composer - sticky at bottom */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto">
          <HelpdeskMessageComposer
            value={draftMessage}
            onChange={setDraftMessage}
            pendingFiles={pendingFiles}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            onSubmit={handleSubmit}
            isSubmitting={isLoading}
            isRecording={isRecording}
            recordingError={recordingError}
            onToggleRecording={toggleRecording}
            placeholder="Describí tu solicitud..."
            submitAriaLabel="Enviar ticket"
            className="px-4 py-3 space-y-3"
          />
        </div>
      </div>
    </div>
  );
};

export default HelpdeskNewTicketPage;
