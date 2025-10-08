# Frontend - Base de Modelo Boilerplate

Frontend moderno desarrollado con React 18, TypeScript, Vite y Tailwind CSS.

## 🚀 Características

- **React 18** con TypeScript
- **Vite** como bundler de desarrollo
- **Redux Toolkit** para estado global
- **React Router** para navegación
- **Tailwind CSS** para estilos
- **Shadcn/ui** para componentes
- **React Hook Form** para formularios
- **Axios** para llamadas API

## 📁 Estructura del proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── layout/         # Componentes de layout
│   └── icons/          # Iconos
├── features/           # Características por módulo
│   ├── auth/          # Autenticación
│   ├── dashboard/     # Dashboard
│   └── users/         # Gestión de usuarios
├── pages/             # Páginas principales
├── store/             # Estado global (Redux)
├── lib/               # Utilidades y configuración
├── hooks/             # Custom hooks
└── types/             # Tipos de TypeScript
```

## 🏗️ Arquitectura

### Patrón de features

Cada feature tiene la siguiente estructura:

```
features/auth/
├── api/               # API slice (RTK Query)
├── components/        # Componentes específicos
├── pages/             # Páginas del feature
├── hooks/             # Custom hooks
├── types/             # Tipos específicos
└── authSlice.ts       # Redux slice
```

### Estado global

- **Redux Toolkit** para estado global
- **RTK Query** para cache de datos
- **Redux Persist** para persistencia

## 🔐 Autenticación

### Sistema de autenticación

```typescript
// authSlice.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}
```

### Protección de rutas

```typescript
// RequireAuth.tsx
interface RequireAuthProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ 
  allowedRoles = [], 
  children 
}) => {
  const user = useSelector(selectCurrentUser);
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};
```

### Rutas protegidas

```typescript
// App.tsx
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<DashboardPage />} />
          <Route element={<RequireAuth allowedRoles={['admin', 'superadmin']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
```

### Navegación programática

```typescript
const navigate = useNavigate();

const handleSubmit = async (data: FormData) => {
  try {
    await submitData(data);
    navigate('/success');
  } catch (error) {
    // Manejar error
  }
};
```

## 🎨 Estilos y temas

### Tailwind CSS

```typescript
// Clases utilitarias
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900">Título</h2>
  <Button className="bg-blue-600 hover:bg-blue-700">Acción</Button>
</div>
```

### Tema oscuro

```typescript
// theme-provider.tsx
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

## 🔄 Gestión de estado

### Redux Toolkit

```typescript
// store/store.ts
export const store = configureStore({
  reducer: {
    auth: authSlice,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### RTK Query

```typescript
// api/apiSlice.ts
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Dashboard'],
  endpoints: (builder) => ({}),
});
```

### Selectors

```typescript
// authSlice.ts
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthToken = (state: RootState) => state.auth.token;
```

### Acciones

```typescript
// authSlice.ts
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
```

## 📦 Componentes

### Componentes base (shadcn/ui)

```typescript
// components/ui/button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### Componentes de layout

```typescript
// components/layout/MainLayout.tsx
export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
```

### Formularios con React Hook Form

```typescript
// components/forms/LoginForm.tsx
interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
    } catch (error) {
      // Manejar error
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          {...register('email', { required: 'Email es requerido' })}
          type="email"
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.email && <span className="text-red-500">{errors.email.message}</span>}
      </div>
      
      <div>
        <label htmlFor="password">Contraseña</label>
        <input
          {...register('password', { required: 'Contraseña es requerida' })}
          type="password"
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.password && <span className="text-red-500">{errors.password.message}</span>}
      </div>
      
      <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md">
        Iniciar Sesión
      </button>
    </form>
  );
};
```

## 🔧 Configuración

### Variables de entorno

```env
# .env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Base de Modelo
VITE_APP_VERSION=1.0.0
```

### Configuración de Vite

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### Configuración de TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 📊 Performance

### Optimizaciones

- **Code splitting** con lazy loading
- **Memoización** de componentes
- **Virtualización** de listas largas
- **Compression** de assets
- **Service Worker** para caching

### Lazy loading

```typescript
// App.tsx
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

// Uso
<Suspense fallback={<LoadingSpinner />}>
  <DashboardPage />
</Suspense>
```

### Memoización

```typescript
// Componente memoizado
const ExpensiveComponent = React.memo<Props>(({ data }) => {
  const expensiveValue = useMemo(() => {
    return heavyCalculation(data);
  }, [data]);
  
  return <div>{expensiveValue}</div>;
});

// Callback memoizado
const handleClick = useCallback(() => {
  // Lógica del click
}, [dependency]);
```

## 🧪 Testing

### Jest y React Testing Library

```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing de hooks

```typescript
// hooks/__tests__/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  test('should login user', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

## 🐛 Debugging

### React Developer Tools

```typescript
// Configuración para desarrollo
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

### Error boundaries

```typescript
// ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    
    return this.props.children;
  }
}
```

## 🚀 Despliegue

### Build para producción

```bash
# Compilar para producción
npm run build

# Preview de producción
npm run preview
```

### Configuración de Nginx

```nginx
server {
  listen 80;
  server_name example.com;
  
  root /var/www/html;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  location /api {
    proxy_pass http://backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 Desarrollo

### Scripts disponibles

```bash
npm run dev        # Desarrollo con hot reload
npm run build      # Compilar para producción
npm run preview    # Preview de producción
npm run test       # Ejecutar tests
npm run lint       # Linter
npm run type-check # Verificar tipos
```

### Configuración de ESLint

```javascript
// eslint.config.js
export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  plugins: {
      react: reactPlugin,
      '@typescript-eslint': tsPlugin,
  },
  rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
];
```

## 📚 Extensión

### Agregar nueva feature

1. **Crear estructura de feature:**
```bash
mkdir -p src/features/example/{api,components,hooks,types}
```

2. **Crear API slice:**
```typescript
// features/example/api/exampleApiSlice.ts
export const exampleApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExamples: builder.query<Example[], void>({
      query: () => '/examples',
      providesTags: ['Example'],
    }),
  }),
});
```

3. **Crear componentes:**
```typescript
// features/example/components/ExampleList.tsx
export const ExampleList: React.FC = () => {
  const { data: examples, isLoading } = useGetExamplesQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <ul>
      {examples?.map(example => (
        <li key={example.id}>{example.name}</li>
      ))}
    </ul>
  );
};
```

4. **Crear página:**
```typescript
// features/example/pages/ExamplePage.tsx
export const ExamplePage: React.FC = () => {
  return (
    <div>
      <h1>Examples</h1>
      <ExampleList />
    </div>
  );
};
```

## 🤝 Contribución

### Guía de estilo

- **ESLint** y **Prettier** configurados
- **TypeScript** estricto
- **Conventional Commits** para mensajes
- **Tests** requeridos para nuevas características

### Workflow

1. Fork y clone
2. Crear feature branch
3. Desarrollar con tests
4. Commit y push
5. Crear PR

---

**Desarrollado con ❤️ para ser una base sólida para tus proyectos frontend**
