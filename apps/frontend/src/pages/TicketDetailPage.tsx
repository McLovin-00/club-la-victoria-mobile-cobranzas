import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  FolderIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import {
  useGetTicketByIdQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useSendMessageWithAttachmentsMutation,
  useSendResolverMessageMutation,
  useCloseTicketMutation,
  useReopenTicketMutation,
  useMarkTicketReadMutation,
  useUpdateTicketPriorityMutation,
  useUpdateTicketStatusMutation,
} from '../features/helpdesk/api/helpdeskApi';
import { selectCurrentUser } from '../features/auth/authSlice';
import { useIsHelpdeskStaff } from '../hooks/useHelpdeskStaff';
import { HelpdeskMessageComposer } from '../features/helpdesk/components/HelpdeskMessageComposer';
import { Logger } from '../lib/utils';
import type { Ticket, TicketMessage } from '../features/helpdesk/types';
import { MessageAttachment } from '../features/helpdesk/components/MessageAttachment';
import { MediaLightbox } from '../features/helpdesk/components/MediaLightbox';
import { isImage, isVideo, getAttachmentUrl } from '../features/helpdesk/components/mediaUtils';
import { useProtectedObjectUrlMap } from '../features/helpdesk/components/attachmentAsset';
import { useHelpdeskVoiceNote } from '../features/helpdesk/hooks/useHelpdeskVoiceNote';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  MESSAGE_BUBBLE_STYLES,
} from '../features/helpdesk/constants';
import { SourceBadge } from '../features/helpdesk/components/ui';

interface TicketHeaderBlockProps {
  ticket: Ticket;
  replyAsResolver: boolean;
  isTicketOwner: boolean;
  isClosed: boolean;
  isClosing: boolean;
  isReopening: boolean;
  isStaff: boolean;
  isUpdatingPriority: boolean;
  isUpdatingStatus: boolean;
  onBack: () => void;
  onClose: () => void;
  onReopen: () => void;
  onPriorityChange: (priority: 'LOW' | 'NORMAL' | 'HIGH') => void;
  onStatusChange: (status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => void;
}

const TicketHeaderBlock: React.FC<TicketHeaderBlockProps> = ({
  ticket,
  replyAsResolver,
  isTicketOwner,
  isClosed,
  isClosing,
  isReopening,
  isStaff,
  isUpdatingPriority,
  isUpdatingStatus,
  onBack,
  onClose,
  onReopen,
  onPriorityChange,
  onStatusChange,
}) => {
  const ticketPriority = ticket.confirmedPriority || ticket.priority;
  
  // Priority icon helper
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'NORMAL':
        return <ClockIcon className="h-4 w-4 text-amber-500" />;
      case 'LOW':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  // Status icon helper
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />;
      case 'IN_PROGRESS':
        return <ClockIcon className="h-3.5 w-3.5" />;
      case 'RESOLVED':
        return <CheckCircleIcon className="h-3.5 w-3.5" />;
      case 'CLOSED':
        return <LockClosedIcon className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'TELEGRAM':
        return <PaperAirplaneIcon className="h-3 w-3" />;
      case 'PLATFORM':
        return <ComputerDesktopIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card border-b px-4 py-3">
      {/* Fila 1: Volver + Ticket # + Status + Acciones */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Volver
          </button>
          <span className="text-sm font-semibold text-foreground">#{ticket.number}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
            {getStatusIcon(ticket.status)}
            {STATUS_LABELS[ticket.status]}
          </span>
          <SourceBadge source={ticket.source} />
        </div>
        {isTicketOwner && (
          <div className="flex gap-1.5 shrink-0">
            {isClosed ? (
              <button type="button" onClick={onReopen} disabled={isReopening}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-all">
                <ArrowPathIcon className={`h-3.5 w-3.5 ${isReopening ? 'animate-spin' : ''}`} />
                {isReopening ? 'Reabriendo...' : 'Reabrir'}
              </button>
            ) : (
              <button type="button" onClick={onClose} disabled={isClosing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-all">
                <LockClosedIcon className="h-3.5 w-3.5" />
                {isClosing ? 'Cerrando...' : 'Cerrar'}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Fila 2: Subject */}
      <h1 className="text-sm font-medium text-foreground truncate mb-1.5">{ticket.subject}</h1>
      
      {/* Fila 3: Meta compacto */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FolderIcon className="h-3.5 w-3.5" />
          {ticket.category === 'TECHNICAL' ? 'Técnico' : 'Operativo'}
        </span>
        {isStaff ? (
          <span className="flex items-center gap-1">
            {getPriorityIcon(ticketPriority)}
            <select value={ticketPriority}
              onChange={(e) => onPriorityChange(e.target.value as 'LOW' | 'NORMAL' | 'HIGH')}
              disabled={isUpdatingPriority || isClosed}
              className={`bg-transparent border-none cursor-pointer disabled:opacity-50 ${PRIORITY_COLORS[ticketPriority] || 'text-muted-foreground'}`}>
              <option value="LOW">Baja</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
            </select>
          </span>
        ) : (
          <span className={`flex items-center gap-1 ${PRIORITY_COLORS[ticketPriority] || 'text-muted-foreground'}`}>
            {getPriorityIcon(ticketPriority)}
            {PRIORITY_LABELS[ticketPriority]}
          </span>
        )}
        {isStaff && !isClosed && (
          <span className="flex items-center gap-1">
            <select value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED')}
              disabled={isUpdatingStatus}
              className="bg-transparent border-none cursor-pointer disabled:opacity-50">
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="RESOLVED">Resuelto</option>
            </select>
          </span>
        )}
        <span className="flex items-center gap-1">
          <UserCircleIcon className="h-3.5 w-3.5" />
          {ticket.createdByName}
        </span>
        <span className="flex items-center gap-1">
          <CalendarIcon className="h-3.5 w-3.5" />
          {new Date(ticket.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      {/* Resolver indicator */}
      {replyAsResolver && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded px-2 py-0.5">
          <ChatBubbleLeftRightIcon className="h-3 w-3" />
          Respondiendo como <strong>Soporte</strong>
        </div>
      )}
    </div>
  );
};

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  fileName: string;
  mimeType: string;
}

// Helper for relative timestamps
function getRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Recién';
  } else if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours}h`;
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  }
}

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface MessagesScrollProps {
  messages: TicketMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onOpenLightbox: (index: number) => void;
  previewUrlById: Record<string, string>;
  mediaIndexById: Map<string, number>;
}

const MessagesScroll: React.FC<MessagesScrollProps> = ({ 
  messages, 
  isLoading, 
  messagesEndRef,
  onOpenLightbox,
  previewUrlById,
  mediaIndexById,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <div className="relative">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
        </div>
        <span className="text-sm text-muted-foreground animate-pulse">Cargando conversación...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground text-center">
          <span className="font-medium">Sin mensajes aún</span>
          <br />
          <span className="text-sm">Sé el primero en escribir</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {messages.map((msg: TicketMessage, index: number) => {
        const isUser = msg.senderType === 'USER';
        const isSystem = msg.senderType === 'SYSTEM';
        const isResolver = msg.senderType === 'RESOLVER';
        
        return (
          <div 
            key={msg.id} 
            className={`flex gap-2.5 ${isSystem ? 'justify-center' : isUser ? 'justify-start' : 'justify-end'} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
          >
            {/* Avatar - only for non-system messages */}
            {!isSystem && (
              <div className={`shrink-0 ${isUser ? 'order-1' : 'order-2'}`}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isResolver 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                  title={msg.senderName}
                >
                  {getInitials(msg.senderName)}
                </div>
              </div>
            )}
            
            {/* Message bubble */}
            <div className={`max-w-[75%] ${isSystem ? 'max-w-full' : ''}`}>
              <div className={`${isSystem ? 'text-center' : ''}`}>
                {/* Sender name and time */}
                <div className={`flex items-center gap-2 mb-1 ${isResolver ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-xs font-medium ${
                    isResolver 
                      ? 'text-primary/80' 
                      : isSystem 
                        ? 'text-muted-foreground' 
                        : 'text-muted-foreground'
                  }`}>
                    {msg.senderName}
                    {isResolver && <span className="ml-1 opacity-70">· Soporte</span>}
                  </span>
                  <span 
                    className="text-xs text-muted-foreground/60 cursor-default hover:text-muted-foreground transition-colors"
                    title={new Date(msg.createdAt).toLocaleString('es-AR')}
                  >
                    {getRelativeTime(msg.createdAt)}
                  </span>
                </div>
                
                {/* Message content */}
                <div className={`rounded-2xl px-4 py-2.5 ${MESSAGE_BUBBLE_STYLES[msg.senderType]} ${
                  isResolver 
                    ? 'rounded-tr-sm' 
                    : isUser 
                      ? 'rounded-tl-sm' 
                      : 'rounded-none'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
                
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 ? (
                  <div className={`mt-2 flex flex-col items-start gap-2 ${isResolver ? 'items-end' : ''}`}>
                    {msg.attachments.map((att) => {
                      const globalIndex = mediaIndexById.get(att.id) ?? -1;
                      
                      return (
                        <MessageAttachment
                          key={att.id}
                          attachment={att}
                          index={globalIndex}
                          onOpenLightbox={onOpenLightbox}
                          previewUrl={previewUrlById[att.id] ?? null}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin/helpdesk');
  const backPath = isAdminRoute ? '/admin/helpdesk' : '/helpdesk';
  const user = useSelector(selectCurrentUser);
  const isStaff = useIsHelpdeskStaff();
  const { confirm } = useConfirmDialog();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [composerError, setComposerError] = useState('');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const {
    data: ticket,
    isLoading: isLoadingTicket,
    error: ticketError,
  } = useGetTicketByIdQuery(id!, { skip: !id });

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useGetMessagesQuery(id!, { skip: !id });

  const [sendMessage, { isLoading: isSendingUser }] = useSendMessageMutation();
  const [sendMessageWithAttachments, { isLoading: isSendingUserWithAttachments }] =
    useSendMessageWithAttachmentsMutation();
  const [sendResolverMessage, { isLoading: isSendingResolver }] = useSendResolverMessageMutation();
  const [closeTicket, { isLoading: isClosing }] = useCloseTicketMutation();
  const [reopenTicket, { isLoading: isReopening }] = useReopenTicketMutation();
  const [markTicketRead] = useMarkTicketReadMutation();
  const [updatePriority, { isLoading: isUpdatingPriority }] = useUpdateTicketPriorityMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateTicketStatusMutation();

  const messages = messagesData?.data ?? [];
  const messagesLoadError = Boolean(messagesError);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const latestMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : undefined;
  const latestMarkedMessageIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!id || !ticket || !latestMessageId) {
      return;
    }

    if (latestMarkedMessageIdRef.current === latestMessageId) {
      return;
    }

    latestMarkedMessageIdRef.current = latestMessageId;
    void markTicketRead(id).unwrap().catch(error => {
      Logger.warn('No se pudo marcar el ticket como leído', error);
    });
  }, [id, latestMessageId, markTicketRead, ticket]);

  const mediaAttachments = useMemo(
    () =>
      messages
      .flatMap(m => m.attachments || [])
      .filter(att => isImage(att.mimeType) || isVideo(att.mimeType)),
    [messages]
  );

  const protectedMediaSources = useMemo(
    () => mediaAttachments.map(att => ({ id: att.id, sourceUrl: getAttachmentUrl(att) })),
    [mediaAttachments]
  );

  const previewUrlById = useProtectedObjectUrlMap(protectedMediaSources);

  const mediaItems = useMemo<MediaItem[]>(
    () =>
      mediaAttachments
      .map((att) => ({
        id: att.id,
        url: previewUrlById[att.id] ?? '',
        type: isVideo(att.mimeType) ? 'video' as const : 'image' as const,
        fileName: att.filename,
        mimeType: att.mimeType,
      }))
      .filter(item => item.url),
    [mediaAttachments, previewUrlById]
  );

  const mediaIndexById = useMemo(() => {
    return new Map(mediaItems.map((item, index) => [item.id, index]));
  }, [mediaItems]);

  const handleOpenLightbox = (index: number) => {
    if (index < 0) {
      return;
    }

    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
  };

  const addFiles = useCallback((list: FileList | File[]) => {
    const next = Array.from(list).slice(0, 8);
    setPendingFiles(prev => [...prev, ...next].slice(0, 8));
    setComposerError('');
  }, []);

  const removeFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const { isRecording, recordingError, toggleRecording } = useHelpdeskVoiceNote(file => addFiles([file]));

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !ticket || !user) return;

    const content = messageInput.trim().slice(0, 5000);
    const replyAsResolver = isStaff && ticket.createdBy !== user.id;
    const attachments = pendingFiles.length > 0 ? pendingFiles : undefined;

    if (!content && !attachments) {
      setComposerError('Escribí un mensaje o adjuntá un archivo para responder.');
      return;
    }

    setComposerError('');

    try {
      if (replyAsResolver) {
        await sendResolverMessage({ ticketId: id, content, attachments }).unwrap();
      } else if (attachments) {
        await sendMessageWithAttachments({ ticketId: id, content, attachments }).unwrap();
      } else {
        await sendMessage({ ticketId: id, content }).unwrap();
      }
      setMessageInput('');
      setPendingFiles([]);
    } catch (error) {
      Logger.error('Error enviando mensaje en ticket', error);
      setComposerError('No se pudo enviar la respuesta. Probá de nuevo.');
    }
  };

  const handleCloseTicket = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Cerrar ticket',
      message: '¿Estás seguro de que querés cerrar este ticket?',
      confirmText: 'Cerrar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await closeTicket(id).unwrap();
    } catch (error) {
      Logger.error('Error cerrando ticket', error);
    }
  };

  const handleReopenTicket = async () => {
    if (!id) return;

    try {
      await reopenTicket({ id, message: 'Ticket reabierto' }).unwrap();
    } catch (error) {
      Logger.error('Error reabriendo ticket', error);
    }
  };

  const handlePriorityChange = async (priority: 'LOW' | 'NORMAL' | 'HIGH') => {
    if (!id) return;
    try {
      await updatePriority({ ticketId: id, priority }).unwrap();
    } catch (error) {
      Logger.error('Error actualizando prioridad', error);
    }
  };

  const handleStatusChange = async (status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    if (!id) return;
    try {
      await updateStatus({ ticketId: id, status }).unwrap();
    } catch (error) {
      Logger.error('Error actualizando estado', error);
    }
  };

  if (isLoadingTicket) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Cargando ticket...</span>
      </div>
    );
  }

  if (ticketError || !ticket || !user) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          Error al cargar el ticket. Es posible que no exista o no tengas permisos.
        </div>
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Volver a mesa de ayuda
        </button>
      </div>
    );
  }

  const isClosed = ticket.status === 'CLOSED';
  const isTicketOwner = ticket.createdBy === user.id;
  const replyAsResolver = isStaff && !isTicketOwner;
  const isSending = isSendingUser || isSendingUserWithAttachments || isSendingResolver;

  return (
    <div className={`flex flex-col ${isAdminRoute ? 'h-dvh' : 'h-[calc(100dvh-120px)]'}`}>
      <TicketHeaderBlock
        ticket={ticket}
        replyAsResolver={replyAsResolver}
        isTicketOwner={isTicketOwner}
        isClosed={isClosed}
        isClosing={isClosing}
        isReopening={isReopening}
        isStaff={isStaff}
        isUpdatingPriority={isUpdatingPriority}
        isUpdatingStatus={isUpdatingStatus}
        onBack={() => navigate(backPath)}
        onClose={handleCloseTicket}
        onReopen={handleReopenTicket}
        onPriorityChange={handlePriorityChange}
        onStatusChange={handleStatusChange}
      />

      <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
        {messagesLoadError ? (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            No se pudieron cargar los mensajes del ticket. Reintentá en unos segundos.
          </div>
        ) : null}
        <MessagesScroll
          messages={messages}
          isLoading={isLoadingMessages}
          messagesEndRef={messagesEndRef}
          onOpenLightbox={handleOpenLightbox}
          previewUrlById={previewUrlById}
          mediaIndexById={mediaIndexById}
        />
      </div>

      {!isClosed && (
        <div className="bg-card border-t px-4 py-3">
          <HelpdeskMessageComposer
            value={messageInput}
            onChange={setMessageInput}
            pendingFiles={pendingFiles}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            onSubmit={handleSendMessage}
            isSubmitting={isSending}
            isRecording={isRecording}
            recordingError={recordingError}
            onToggleRecording={toggleRecording}
            error={composerError}
            placeholder={replyAsResolver ? 'Respuesta de soporte…' : 'Escribí tu mensaje…'}
            submitAriaLabel={replyAsResolver ? 'Enviar respuesta de soporte' : 'Enviar mensaje'}
          />
        </div>
      )}

      <MediaLightbox
        open={lightboxOpen}
        onClose={handleCloseLightbox}
        media={mediaItems}
        currentIndex={lightboxIndex}
      />
    </div>
  );
};

export default TicketDetailPage;
