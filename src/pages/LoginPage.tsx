import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"

import { useAuth } from "@/auth/useAuth"
import { FriendlyErrorAlert } from "@/components/FriendlyErrorAlert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useLogin } from "@/hooks/useLogin"

const loginSchema = z.object({
  email: z.email("Ingresa un email válido."),
  password: z.string().min(1, "La password es obligatoria."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { login, isLoading, error } = useLogin()
  const passwordResetSuccess =
    typeof location.state === "object" &&
    location.state &&
    "passwordResetSuccess" in location.state &&
    typeof location.state.passwordResetSuccess === "string"
      ? location.state.passwordResetSuccess
      : null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const fromPath =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    location.state.from &&
    typeof location.state.from === "object" &&
    "pathname" in location.state.from &&
    typeof location.state.from.pathname === "string"
      ? location.state.from.pathname
      : "/cuenta"

  const submitHandler = handleSubmit(async (values) => {
    await login(values)
    navigate(fromPath, { replace: true })
  })

  if (isAuthenticated) {
    return <Navigate to="/cuenta" replace />
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md items-center justify-center px-4 py-10">
      <div className="w-full">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground">
            Inicio de sesión
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
            Entra a tu cuenta
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tu correo y contraseña.
          </p>
        </div>

        <form className="space-y-6" onSubmit={submitHandler}>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                aria-invalid={errors.email ? "true" : "false"}
                className="h-11 rounded-none border-0 border-b border-border bg-white px-3 py-0 text-sm shadow-none focus-visible:border-foreground focus-visible:ring-0"
                {...register("email")}
              />
              <FieldError className="text-xs" errors={[errors.email]} />
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </FieldLabel>
                <Link
                  to="/password/reset"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                aria-invalid={errors.password ? "true" : "false"}
                className="h-11 rounded-none border-0 border-b border-border bg-white px-3 py-0 text-sm shadow-none focus-visible:border-foreground focus-visible:ring-0"
                {...register("password")}
              />
              <FieldError className="text-xs" errors={[errors.password]} />
            </Field>
          </FieldGroup>

          {error ? <FriendlyErrorAlert message={error} className="rounded-none border-x-0" /> : null}
          {passwordResetSuccess ? (
            <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {passwordResetSuccess}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="black"
            className="h-11 w-full rounded-none text-sm font-medium shadow-none"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="size-4 text-current" />
                <span>Entrando...</span>
              </span>
            ) : (
              "Entrar"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link to="/registro" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
              Crea una aquí
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
