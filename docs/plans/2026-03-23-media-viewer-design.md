# Media Viewer para Tickets - Design Document

**Fecha:** 2026-03-23
**Estado:** Aprobado
**Alcance:** Pantalla de detalle de tickets (TicketDetailPage)

## Objetivo

Mejorar la experiencia de visualización de medios en el chat de tickets, permitiendo:
1. Ver miniaturas de imágenes y videos dentro de los mensajes
2. Abrir un modal/lightbox para visualizar medios en tamaño completo
3. Reproducir audios con un reproductor embebido que muestre la forma de onda

## Arquitectura de Componentes

```
src/features/helpdesk/components/
├── MessageAttachment.tsx      # Wrapper que decide qué renderizar
├── AttachmentThumbnail.tsx    # Miniatura clickeable para img/video
├── AudioWaveformPlayer.tsx    # Reproductor de audio con waveform
└── MediaLightbox.tsx          # Modal con navegación, zoom y descarga
```

### Flujo de Datos

```
MessageAttachment (recibe attachment)
    │
    ├── tipo = IMAGE/VIDEO → AttachmentThumbnail → click → MediaLightbox
    │
    ├── tipo = AUDIO → AudioWaveformPlayer (embebido en mensaje)
    │
    └── tipo = DOCUMENT → Link de descarga directa
```

## Especificaciones por Componente

### 1. MessageAttachment.tsx

**Responsabilidad:** Componente router que decide qué renderizar según el tipo de attachment.

**Props:**
```typescript
interface MessageAttachmentProps {
  attachment: MessageAttachment;
  onOpenLightbox: (index: number) => void;
  index: number;
}
```

**Comportamiento:**
- Si `mimeType` empieza con `image/` → renderiza `AttachmentThumbnail`
- Si `mimeType` empieza con `video/` → renderiza `AttachmentThumbnail`
- Si `mimeType` empieza con `audio/` → renderiza `AudioWaveformPlayer`
- Otherwise → renderiza link de descarga

### 2. AttachmentThumbnail.tsx

**Responsabilidad:** Mostrar miniatura clickeable de 120x120px.

**Props:**
```typescript
interface AttachmentThumbnailProps {
  attachment: MessageAttachment;
  onClick: () => void;
}
```

**Diseño visual:**
- Dimensiones: 120x120px
- `object-fit: cover` para mantener proporción
- Border radius: 8px
- Box shadow sutil en hover
- Para videos: ícono de play (▶️) superpuesto centrado
- Para imágenes: ícono de lupa en hover (esquina inferior derecha)

**Interacción:**
- Click → abre lightbox
- Cursor: pointer

### 3. AudioWaveformPlayer.tsx

**Responsabilidad:** Reproductor de audio embebido con visualización de waveform.

**Props:**
```typescript
interface AudioWaveformPlayerProps {
  url: string;
  fileName: string;
}
```

**Diseño visual (estilo WhatsApp):**
```
[▶️] ━━━━━━━●━━━━━━━━━  1:23 / 3:45
      [forma de onda visual]
```

- Altura total: ~60px
- Waveform generado con `wavesurfer.js`
- Botón play/pause a la izquierda
- Tiempo actual / duración total a la derecha
- Colores:
  - Waveform no reproducido: gris claro
  - Waveform reproducido: color primario de la app
  - Puntero de progreso: destacado

**Interacción:**
- Click en play → reproduce/pausa
- Click en cualquier punto del waveform → seek a esa posición
- Drag del puntero → seek continuo

**Librería:** `wavesurfer.js`

### 4. MediaLightbox.tsx

**Responsabilidad:** Modal para visualizar medios en tamaño completo con navegación, zoom y descarga.

**Props:**
```typescript
interface MediaLightboxProps {
  open: boolean;
  onClose: () => void;
  media: MediaItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  fileName: string;
}
```

**Diseño visual:**
- Overlay: fondo negro con 90% opacidad
- Contenido centrado con animación fade-in
- Botón X en esquina superior derecha
- Flechas de navegación < > a los costados
- Indicador de posición: "2 de 5" (parte inferior)
- Botón de descarga: esquina inferior derecha

**Controles:**

| Acción | Desktop | Mobile |
|--------|---------|--------|
| Navegar | Flechas izq/der, click en < > | Swipe horizontal |
| Zoom | Scroll wheel, botones +/- | Pinch gesture |
| Cerrar | Escape, click fuera, X | Tap fuera, X |
| Descargar | Botón descarga | Botón descarga |

**Zoom (para imágenes):**
- Nivel inicial: fit-to-screen
- Niveles: 1x, 1.5x, 2x, 3x
- Drag para mover imagen con zoom activo
- Doble click → toggle zoom

**Librería:** `yet-another-react-lightbox` con plugin de zoom

## Integración con TicketDetailPage

### Cambios necesarios

1. **Reemplazar links actuales** (líneas ~181-200) por componente `MessageAttachment`

2. **Agregar estado para lightbox:**
```typescript
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxIndex, setLightboxIndex] = useState(0);
const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
```

3. **Handlers:**
```typescript
const handleOpenLightbox = (index: number) => {
  // Filtrar solo imágenes y videos del ticket
  const media = messages
    .flatMap(m => m.attachments)
    .filter(a => isImage(a.mimeType) || isVideo(a.mimeType))
    .map(a => ({
      url: a.url,
      type: isImage(a.mimeType) ? 'image' : 'video',
      fileName: a.filename
    }));
  
  setMediaItems(media);
  setLightboxIndex(index);
  setLightboxOpen(true);
};
```

### No se modifican
- Lógica de carga de mensajes
- WebSockets de tiempo real
- Scroll automático al final
- Envío de mensajes

## Dependencias

```bash
npm install wavesurfer.js yet-another-react-lightbox
```

| Librería | Versión | Tamaño (gzipped) | Propósito |
|----------|---------|------------------|-----------|
| wavesurfer.js | ^7.x | ~45KB | Visualización de waveform de audio |
| yet-another-react-lightbox | ^3.x | ~15KB | Lightbox con zoom para imágenes/videos |

## Tipos de Archivo Soportados

| Tipo | MIME | Visualización | Lightbox |
|------|------|---------------|----------|
| Imagen | image/jpeg, image/png, image/gif, image/webp | Thumbnail | Sí, con zoom |
| Video | video/mp4, video/webm, video/quicktime | Thumbnail con ícono play | Sí, sin zoom |
| Audio | audio/mpeg, audio/wav, audio/ogg, audio/mp4, audio/webm | Reproductor waveform | No |
| Documento | application/pdf, etc. | Link descarga | No |

## Consideraciones de UX

1. **Performance:** Lazy loading de waveforms, solo se generan cuando el mensaje entra en viewport
2. **Accesibilidad:** Navegación por teclado completa, labels descriptivos
3. **Responsive:** Thumbnails se adaptan en mobile, controles touch-friendly
4. **Estados de error:** Mensaje claro si el archivo no puede cargarse
5. **Loading states:** Placeholder mientras carga el thumbnail/waveform

## Tareas de Implementación

1. [ ] Instalar dependencias (wavesurfer.js, yet-another-react-lightbox)
2. [ ] Crear `MessageAttachment.tsx` con lógica de routing
3. [ ] Crear `AttachmentThumbnail.tsx` con estilos
4. [ ] Crear `AudioWaveformPlayer.tsx` con wavesurfer.js
5. [ ] Crear `MediaLightbox.tsx` con navegación y zoom
6. [ ] Integrar en `TicketDetailPage.tsx`
7. [ ] Agregar estilos CSS necesarios
8. [ ] Probar con diferentes tipos de archivo
9. [ ] Probar en mobile (gestures, responsive)

## Criterios de Aceptación

- [ ] Las imágenes se muestran como miniaturas 120x120 en el chat
- [ ] Los videos muestran miniatura con ícono de play
- [ ] Click en thumbnail abre lightbox con el medio
- [ ] El lightbox permite navegar entre medios del mismo tipo
- [ ] El lightbox permite zoom en imágenes (scroll/pinch)
- [ ] El lightbox permite descargar el archivo
- [ ] Los audios muestran waveform y controles de reproducción
- [ ] El reproductor de audio permite seek haciendo click en el waveform
- [ ] Funciona correctamente en desktop y mobile
- [ ] Navegación por teclado funciona (Escape cierra, flechas navegan)
