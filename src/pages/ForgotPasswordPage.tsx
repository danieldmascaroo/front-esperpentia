import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { z } from "zod"

import { requestPasswordReset } from "@/api/authApi"
import { FriendlyErrorAlert } from "@/components/FriendlyErrorAlert"
import { formActionButtonClassName, formInputClassName } from "@/components/form-styles"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toFriendlyErrorMessage } from "@/lib/human-errors"

const forgotPasswordSchema = z.object({
  email: z.email("Ingresa un email válido."),
})
// hola hola 
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    setSuccessMessage(null)

    try {
      await requestPasswordReset(values.email)
      setSuccessMessage("Si el correo existe, te enviaremos instrucciones para recuperar tu contraseña.")
    } catch (error) {
      setServerError(toFriendlyErrorMessage(error, "No pudimos procesar la solicitud."))
    }
  })

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md items-center justify-center px-4 py-10">
      <div className="w-full">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground">
            Recuperar contraseña
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
            Restablece tu acceso
          </h1>
          <p className="text-sm text-muted-foreground">
            Te enviaremos un correo con un enlace para crear una nueva contraseña.
          </p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email" className="text-sm font-medium text-foreground">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              aria-invalid={errors.email ? "true" : "false"}
              className={formInputClassName}
              {...register("email")}
            />
            <FieldError className="text-xs" errors={[errors.email]} />
          </Field>
        </FieldGroup>

        {serverError ? <FriendlyErrorAlert message={serverError} className="rounded-none border-x-0" /> : null}
        {successMessage ? <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

        <Button type="submit" variant="black" className={`w-full ${formActionButtonClassName}`} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="size-4 text-current" />
              <span>Enviando...</span>
            </span>
          ) : (
            "Enviar enlace"
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
