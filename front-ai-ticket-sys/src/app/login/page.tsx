'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Plus, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { authStorage, UserSession } from '@/lib/auth';

interface LoginFormData {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  user: UserSession;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', data);
      const { access_token, user } = response.data;

      authStorage.setSession(access_token, user);
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          setServerError('Credenciales inválidas');
        } else if (error.response?.status === 400) {
          setServerError('Verifica que los campos sean correctos');
        } else if (error.code === 'ERR_NETWORK') {
          setServerError('No se pudo conectar con el servidor. ¿Está corriendo el back?');
        } else {
          setServerError('Ocurrió un error inesperado');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-8">
        {/* Header con logo */}
        <div className="flex flex-col items-center pb-6 border-b border-card-border">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-4 text-2xl font-bold">IncidentFlow</h1>
          <p className="mt-1 text-sm text-muted-light">
            Plataforma de gestión de incidencias
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold mb-2">
              Nombre de usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                id="username"
                type="text"
                placeholder="admin"
                autoComplete="username"
                {...register('username', {
                  required: 'El nombre de usuario es obligatorio',
                })}
                className={`w-full pl-10 pr-3 py-3 bg-input rounded-lg outline-none transition-colors focus:border-primary border ${
                  errors.username ? 'border-danger' : 'border-input-border'
                }`}
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-xs text-danger">{errors.username.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', {
                  required: 'La contraseña es obligatoria',
                  minLength: {
                    value: 6,
                    message: 'Debe tener al menos 6 caracteres',
                  },
                })}
                className={`w-full pl-10 pr-10 py-3 bg-input rounded-lg outline-none transition-colors focus:border-primary border ${
                  errors.password ? 'border-danger' : 'border-input-border'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Error del servidor */}
          {serverError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-danger-bg border border-danger/30">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{serverError}</p>
            </div>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Info de roles disponibles */}
        <div className="mt-6 px-4 py-3 rounded-lg bg-input border border-card-border">
          <p className="text-xs text-muted mb-2">Roles disponibles en el sistema</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs rounded-full border border-card-border text-muted-light">
              Cliente
            </span>
            <span className="px-3 py-1 text-xs rounded-full bg-primary text-white">
              Admin
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}