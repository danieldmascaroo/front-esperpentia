import { useDeferredValue, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { BannerDiv } from "@/components/BannerDiv"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getComunas, getRegions, registerUser } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Comuna, Region } from "@/pages/types"

const registerSchema = z
  .object({
    email: z.email("Ingresa un email válido."),
    nombre: z.string().trim().min(1, "El nombre es obligatorio."),
    apellido: z.string().trim().min(1, "El apellido es obligatorio."),
    telefono: z
      .string()
      .trim()
      .min(8, "El telefono es obligatorio.")
      .regex(/^[+\d()\-\s]+$/, "Ingresa un telefono válido."),
    direccion: z.string().trim(),
    regionId: z.string().min(1, "La region es obligatoria."),
    comunaId: z.string().min(1, "La comuna es obligatoria."),
    password: z
      .string()
      .min(8, "La password debe tener al menos 8 caracteres.")
      .regex(/[A-Za-z]/, "La password debe incluir al menos una letra.")
      .regex(/\d/, "La password debe incluir al menos un número.")
      .regex(/^\S+$/, "La password no puede tener espacios."),
    rePassword: z.string(),
  })
  .refine(({ password, rePassword }) => password === rePassword, {
    message: "Las passwords no coinciden.",
    path: ["rePassword"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

type SearchableOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  id: string
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  emptyMessage: string
  disabled?: boolean
  loading?: boolean
  invalid?: boolean
}

function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage,
  disabled = false,
  loading = false,
  invalid = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)

  const selectedOption = options.find((option) => option.value === value)
  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const filteredOptions = normalizedQuery.length
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : options

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label ?? "")
    }
  }, [isOpen, selectedOption])

  return (
    <div className="relative">
      <Input
        id={id}
        value={isOpen ? query : selectedOption?.label ?? query}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={invalid ? "true" : "false"}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        disabled={disabled}
        onFocus={() => {
          setIsOpen(true)
          setQuery(selectedOption?.label ?? "")
        }}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setIsOpen(true)
          if (value) {
            onChange("")
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false)
            setQuery(selectedOption?.label ?? "")
          }, 120)
        }}
      />

      {isOpen ? (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md ring-1 ring-foreground/10",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              <span>Cargando opciones...</span>
            </div>
          ) : filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  value === option.value ? "bg-accent text-accent-foreground" : "text-foreground"
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  onChange(option.value)
                  setQuery(option.label)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function RegisterPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingComunas, setLoadingComunas] = useState(false)
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      nombre: "",
      apellido: "",
      telefono: "",
      direccion: "",
      regionId: "",
      comunaId: "",
      password: "",
      rePassword: "",
    },
  })

  const password = watch("password")
  const rePassword = watch("rePassword")
  const regionId = watch("regionId")
  const regionOptions = regions.map((region) => ({
    value: String(region.id),
    label: region.nombre,
  }))
  const comunaOptions = comunas.map((comuna) => ({
    value: String(comuna.id),
    label: comuna.nombre,
  }))

  useEffect(() => {
    if (!rePassword.length) {
      return
    }

    void trigger("rePassword")
  }, [password, rePassword, trigger])

  useEffect(() => {
    let active = true

    async function loadRegions() {
      setLoadingRegions(true)
      try {
        const data = await getRegions()
        if (!active) {
          return
        }
        setRegions(data)
      } catch (err) {
        if (!active) {
          return
        }
        const text = err instanceof Error ? err.message : "Error inesperado"
        setError(text)
      } finally {
        if (active) {
          setLoadingRegions(false)
        }
      }
    }

    void loadRegions()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    setComunas([])
    setValue("comunaId", "")

    if (!regionId) {
      setLoadingComunas(false)
      return () => {
        active = false
      }
    }

    async function loadComunas() {
      setLoadingComunas(true)
      try {
        const data = await getComunas(Number(regionId))
        if (!active) {
          return
        }
        setComunas(data)
      } catch (err) {
        if (!active) {
          return
        }
        const text = err instanceof Error ? err.message : "Error inesperado"
        setError(text)
      } finally {
        if (active) {
          setLoadingComunas(false)
        }
      }
    }

    void loadComunas()

    return () => {
      active = false
    }
  }, [regionId, setValue])

  async function onSubmit(values: RegisterFormValues) {
    setMessage(null)
    setError(null)

    try {
      await registerUser({
        email: values.email,
        nombre: values.nombre,
        apellido: values.apellido,
        telefono: values.telefono,
        direccion_entrega: values.direccion,
        region_id: Number(values.regionId),
        comuna_id: Number(values.comunaId),
        password: values.password,
        re_password: values.rePassword,
      })
      reset()
      setMessage("Cuenta creada. Revisa tu correo para activar el usuario.")
    } catch (err) {
      const text = err instanceof Error ? err.message : "Error inesperado"
      setError(text)
    }
  }

  const submitHandler = handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <BannerDiv title="REGISTRO" subtitle="Crea tu cuenta para comprar en Esperpentia.">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
              <Input
                id="nombre"
                autoComplete="given-name"
                placeholder="Tu nombre"
                aria-invalid={errors.nombre ? "true" : "false"}
                {...register("nombre")}
              />
              <FieldError errors={[errors.nombre]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="apellido">Apellido</FieldLabel>
              <Input
                id="apellido"
                autoComplete="family-name"
                placeholder="Tu apellido"
                aria-invalid={errors.apellido ? "true" : "false"}
                {...register("apellido")}
              />
              <FieldError errors={[errors.apellido]} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="direccion">Dirección de entrega</FieldLabel>
            <Input
              id="direccion"
              autoComplete="street-address"
              placeholder="Calle, número, comuna"
              aria-invalid={errors.direccion ? "true" : "false"}
              {...register("direccion")}
            />
            <FieldError errors={[errors.direccion]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="telefono">Teléfono</FieldLabel>
            <Input
              id="telefono"
              autoComplete="tel"
              placeholder="+56 9 1234 5678"
              aria-invalid={errors.telefono ? "true" : "false"}
              {...register("telefono")}
            />
            <FieldError errors={[errors.telefono]} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="region">Region</FieldLabel>
              <div className="space-y-2">
                <Controller
                  control={control}
                  name="regionId"
                  render={({ field }) => (
                    <SearchableSelect
                      id="region"
                      value={field.value}
                      onChange={field.onChange}
                      options={regionOptions}
                      placeholder={loadingRegions ? "Cargando regiones..." : "Región"}
                      emptyMessage="No hay regiones que coincidan."
                      disabled={loadingRegions}
                      loading={loadingRegions}
                      invalid={!!errors.regionId}
                    />
                  )}
                />
                {loadingRegions ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    <span>Cargando regiones...</span>
                  </div>
                ) : null}
              </div>
              <FieldError errors={[errors.regionId]} />
            </Field>

            {regionId ? (
              <Field>
                <FieldLabel htmlFor="comuna">Comuna</FieldLabel>
                <div className="space-y-2">
                  <Controller
                    control={control}
                    name="comunaId"
                    render={({ field }) => (
                      <SearchableSelect
                        id="comuna"
                        value={field.value}
                        onChange={field.onChange}
                        options={comunaOptions}
                        placeholder={loadingComunas ? "Cargando comunas..." : "Comuna"}
                        emptyMessage="No hay comunas que coincidan."
                        disabled={loadingComunas}
                        loading={loadingComunas}
                        invalid={!!errors.comunaId}
                      />
                    )}
                  />
                  {loadingComunas ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-4" />
                      <span>Cargando comunas...</span>
                    </div>
                  ) : null}
                </div>
                <FieldError errors={[errors.comunaId]} />
              </Field>
            ) : null}
          </div>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimo 8 caracteres"
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="re-password">Repetir password</FieldLabel>
            <Input
              id="re-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repite tu password"
              aria-invalid={errors.rePassword ? "true" : "false"}
              {...register("rePassword")}
            />
            <FieldError errors={[errors.rePassword]} />
          </Field>
        </FieldGroup>

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="submit"
          className="w-full bg-black text-white hover:bg-black/90"
          disabled={isSubmitting || loadingRegions || loadingComunas}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="size-4 text-current" />
              <span>Creando cuenta...</span>
            </span>
          ) : (
            "Registrarme"
          )}
        </Button>
      </form>
    </BannerDiv>
  )
}





