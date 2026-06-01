import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { z } from "zod"

import { confirmPasswordReset } from "@/api/authApi"
import { BannerDiv } from "@/components/BannerDiv"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "La password debe tener al menos 8 caracteres.")
      .regex(/[A-Za-z]/, "La password debe incluir al menos una letra.")
      .regex(/\d/, "La password debe incluir al menos un número.")
      .regex(/^\S+$/, "La password no puede tener espacios."),
    reNewPassword: z.string(),
  })
  .refine(({ newPassword, reNewPassword }) => newPassword === reNewPassword, {
    message: "Las passwords no coinciden.",
    path: ["reNewPassword"],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordConfirmPage() {
  const navigate = useNavigate()
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      reNewPassword: "",
    },
  })

  if (!uid || !token) {
    return <Navigate to="/password/reset" replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password: values.newPassword,
        re_new_password: values.reNewPassword,
      })
      navigate("/login", {
        replace: true,
        state: {
          passwordResetSuccess: "Tu contraseña fue actualizada. Ahora puedes iniciar sesión.",
        },
      })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No pudimos restablecer tu contraseña.")
    }
  })

  return (
    <BannerDiv title="NUEVA PASSWORD" subtitle="Define una contraseña nueva para tu cuenta." className="max-w-md">
      <form className="space-y-5" onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-password">Nueva password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Nueva password"
              aria-invalid={errors.newPassword ? "true" : "false"}
              {...register("newPassword")}
            />
            <FieldError errors={[errors.newPassword]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="re-new-password">Repite la nueva password</FieldLabel>
            <Input
              id="re-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repite tu nueva password"
              aria-invalid={errors.reNewPassword ? "true" : "false"}
              {...register("reNewPassword")}
            />
            <FieldError errors={[errors.reNewPassword]} />
          </Field>
        </FieldGroup>

        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

        <Button type="submit" variant="black" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="size-4 text-current" />
              <span>Guardando...</span>
            </span>
          ) : (
            "Actualizar password"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="underline underline-offset-2 hover:text-foreground">
            Volver al login
          </Link>
        </p>
      </form>
    </BannerDiv>
  )
}
