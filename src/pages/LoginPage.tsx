import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"

import { useAuth } from "@/auth/useAuth"
import { BannerDiv } from "@/components/BannerDiv"
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
    <BannerDiv title="LOGIN" subtitle="Ingresa con tu email y password." className="max-w-md">
      <form className="space-y-5" onSubmit={submitHandler}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              aria-invalid={errors.email ? "true" : "false"}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Tu password"
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>
        </FieldGroup>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {error ? (
          <p className="text-sm">
            <Link to="/password/reset" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        ) : null}
        {passwordResetSuccess ? <p className="text-sm text-emerald-600">{passwordResetSuccess}</p> : null}

        <Button type="submit" variant="black" className="w-full" disabled={isLoading}>
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
          <Link to="/registro" className="underline underline-offset-2 hover:text-foreground">
            Crea una aquí
          </Link>
        </p>
      </form>
    </BannerDiv>
  )
}
