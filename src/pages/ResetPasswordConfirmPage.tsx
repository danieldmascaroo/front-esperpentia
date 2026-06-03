import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { z } from "zod"

import { confirmPasswordReset } from "@/api/authApi"
import { FriendlyErrorAlert } from "@/components/FriendlyErrorAlert"
import { formActionButtonClassName, formInputClassName } from "@/components/form-styles"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toFriendlyErrorMessage } from "@/lib/human-errors"

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
      setServerError(toFriendlyErrorMessage(error, "No pudimos restablecer tu contraseña."))
    }
  })

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md items-center justify-center px-4 py-10">
      <div className="w-full">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground">
            Nueva contraseña
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
            Define tu nueva clave
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea una contraseña nueva para tu cuenta.
          </p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-password" className="text-sm font-medium text-foreground">Nueva password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Nueva password"
              aria-invalid={errors.newPassword ? "true" : "false"}
              className={formInputClassName}
              {...register("newPassword")}
            />
            <FieldError className="text-xs" errors={[errors.newPassword]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="re-new-password" className="text-sm font-medium text-foreground">Repite la nueva password</FieldLabel>
            <Input
              id="re-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repite tu nueva password"
              aria-invalid={errors.reNewPassword ? "true" : "false"}
              className={formInputClassName}
              {...register("reNewPassword")}
            />
            <FieldError className="text-xs" errors={[errors.reNewPassword]} />
          </Field>
        </FieldGroup>

        {serverError ? <FriendlyErrorAlert message={serverError} className="rounded-none border-x-0" /> : null}

        <Button type="submit" variant="black" className={`w-full ${formActionButtonClassName}`} disabled={isSubmitting}>
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
          <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
            Volver al login
          </Link>
        </p>
        </form>
      </div>
    </section>
  )
}
