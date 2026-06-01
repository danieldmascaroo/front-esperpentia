import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { z } from "zod"

import { requestPasswordReset } from "@/api/authApi"
import { BannerDiv } from "@/components/BannerDiv"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

const forgotPasswordSchema = z.object({
  email: z.email("Ingresa un email válido."),
})

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
      setServerError(error instanceof Error ? error.message : "No pudimos procesar la solicitud.")
    }
  })

  return (
    <BannerDiv
      title="RECUPERAR PASSWORD"
      subtitle="Te enviaremos un correo con un enlace para crear una nueva contraseña."
      className="max-w-md"
    >
      <form className="space-y-5" onSubmit={onSubmit}>
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
        </FieldGroup>

        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

        <Button type="submit" variant="black" className="w-full" disabled={isSubmitting}>
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
          <Link to="/login" className="underline underline-offset-2 hover:text-foreground">
            Volver al login
          </Link>
        </p>
      </form>
    </BannerDiv>
  )
}
