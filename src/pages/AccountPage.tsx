import { useCallback, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useAuth } from "@/auth/useAuth"
import { BannerDiv } from "@/components/BannerDiv"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getComunas, getRegions } from "@/lib/api"
import type { Comuna, Region } from "@/pages/types"

const accountSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  direccion: z.string().trim(),
  regionId: z.string().min(1, "La region es obligatoria."),
  comunaId: z.string().min(1, "La comuna es obligatoria."),
})

type AccountFormValues = z.infer<typeof accountSchema>

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive"

function buildFormValues(user: AccountPageUser): AccountFormValues {
  return {
    nombre: user?.nombre ?? "",
    apellido: user?.apellido ?? "",
    direccion: user?.direccion_entrega ?? "",
    regionId: user?.region_id ? String(user.region_id) : "",
    comunaId: user?.comuna_id ? String(user.comuna_id) : "",
  }
}

type AccountPageUser = ReturnType<typeof useAuth>["user"]

function ProfileRow({
  label,
  value,
  children,
  error,
}: {
  label: string
  value?: string
  children?: React.ReactNode
  error?: { message?: string }
}) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-start sm:gap-4">
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">{label}</p>
      <div className="min-w-0">
        {children ?? <p className="text-sm text-foreground">{value || "-"}</p>}
        {error ? <FieldError className="mt-2" errors={[error]} /> : null}
      </div>
    </div>
  )
}

export function AccountPage() {
  const { authLoading, updateProfile, user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [regions, setRegions] = useState<Region[]>([])
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingComunas, setLoadingComunas] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const initializedRegionRef = useRef<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      direccion: "",
      regionId: "",
      comunaId: "",
    },
  })

  const regionId = watch("regionId")
  const comunaId = watch("comunaId")

  const resetFormFromUser = useCallback(() => {
    reset(buildFormValues(user))
    initializedRegionRef.current = user?.region_id ? String(user.region_id) : null
  }, [reset, user])

  useEffect(() => {
    if (!user) {
      return
    }

    resetFormFromUser()
  }, [resetFormFromUser, user])

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
      } catch (error) {
        if (!active) {
          return
        }

        setSaveError(error instanceof Error ? error.message : "No se pudieron cargar las regiones")
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

    if (!regionId) {
      setLoadingComunas(false)
      setValue("comunaId", "")
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

        const currentComunaId = getValues("comunaId")
        const hasCurrentComuna = data.some((comuna) => String(comuna.id) === currentComunaId)

        if (initializedRegionRef.current === regionId) {
          initializedRegionRef.current = null
          return
        }

        if (!hasCurrentComuna) {
          setValue("comunaId", "")
        }
      } catch (error) {
        if (!active) {
          return
        }

        setSaveError(error instanceof Error ? error.message : "No se pudieron cargar las comunas")
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
  }, [getValues, regionId, setValue])

  const submitHandler = handleSubmit(async (values) => {
    setSaveMessage(null)
    setSaveError(null)

    try {
      await updateProfile({
        nombre: values.nombre,
        apellido: values.apellido,
        direccion_entrega: values.direccion,
        region_id: Number(values.regionId),
        comuna_id: Number(values.comunaId),
      })
      setSaveMessage("Datos actualizados correctamente.")
      setIsEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudieron actualizar los datos")
    }
  })

  function handleCancelEdit() {
    setSaveError(null)
    resetFormFromUser()
    setIsEditing(false)
  }

  if (authLoading) {
    return (
      <BannerDiv title="CUENTA" subtitle="Resumen de tu sesión autenticada." className="max-w-5xl">
        <div className="flex min-h-64 items-center justify-center rounded-[1.75rem] border border-border bg-card/80">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </BannerDiv>
    )
  }

  const fullName = [user?.nombre, user?.apellido].filter(Boolean).join(" ")
  const comunaPlaceholder = !regionId
    ? "Selecciona una region primero"
    : loadingComunas
      ? user?.comuna?.nombre ?? "Cargando comunas..."
      : comunaId && user?.comuna?.nombre
        ? user.comuna.nombre
        : "Selecciona una comuna"

  return (
    <BannerDiv title="CUENTA" subtitle="Administra tus datos de perfil y entrega." className="max-w-5xl">
        <div className="mb-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Datos del perfil
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Información de tu cuenta</h2>
        </div>

        {isEditing ? (
          <form className="mt-6" onSubmit={submitHandler}>
            <ProfileRow label="Email" value={user?.email ?? "-"} />
            <ProfileRow
              label="Nombre"
              error={errors.nombre ?? errors.apellido}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  id="nombre"
                  autoComplete="given-name"
                  placeholder="Nombre"
                  aria-invalid={errors.nombre ? "true" : "false"}
                  {...register("nombre")}
                />
                <Input
                  id="apellido"
                  autoComplete="family-name"
                  placeholder="Apellido"
                  aria-invalid={errors.apellido ? "true" : "false"}
                  {...register("apellido")}
                />
              </div>
            </ProfileRow>
            <ProfileRow label="Dirección" error={errors.direccion}>
              <Input
                id="direccion"
                autoComplete="street-address"
                placeholder="Dirección de entrega"
                aria-invalid={errors.direccion ? "true" : "false"}
                {...register("direccion")}
              />
            </ProfileRow>
            <ProfileRow label="Region" error={errors.regionId}>
              <select
                id="region"
                className={selectClassName}
                aria-invalid={errors.regionId ? "true" : "false"}
                disabled={loadingRegions}
                {...register("regionId")}
              >
                <option value="">{loadingRegions ? "Cargando regiones..." : "Selecciona una region"}</option>
                {regions.map((region) => (
                  <option key={region.id} value={String(region.id)}>
                    {region.nombre}
                  </option>
                ))}
              </select>
            </ProfileRow>
            <ProfileRow label="Comuna" error={errors.comunaId}>
              <select
                id="comuna"
                className={selectClassName}
                aria-invalid={errors.comunaId ? "true" : "false"}
                disabled={!regionId || loadingComunas}
                {...register("comunaId")}
              >
                <option value="">{comunaPlaceholder}</option>
                {comunas.map((comuna) => (
                  <option key={comuna.id} value={String(comuna.id)}>
                    {comuna.nombre}
                  </option>
                ))}
              </select>
            </ProfileRow>

            {saveMessage ? <p className="mt-5 text-sm text-emerald-600">{saveMessage}</p> : null}
            {saveError ? <p className="mt-5 text-sm text-destructive">{saveError}</p> : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                variant="submit"
                disabled={isSubmitting || loadingRegions || loadingComunas}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="size-4 text-current" />
                    <span>Guardando cambios...</span>
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-6">
            <ProfileRow label="Email" value={user?.email ?? "-"} />
            <ProfileRow label="Nombre" value={fullName} />
            <ProfileRow label="teléfono" value={user?.telefono ?? "-"} />
            <ProfileRow label="Dirección" value={user?.direccion_entrega ?? "-"} />
            <ProfileRow label="Region" value={user?.region?.nombre ?? "-"} />
            <ProfileRow label="Comuna" value={user?.comuna?.nombre ?? "-"} />

            {saveMessage ? <p className="mt-5 text-sm text-emerald-600">{saveMessage}</p> : null}
            {saveError ? <p className="mt-5 text-sm text-destructive">{saveError}</p> : null}

            <div className="mt-6">
              <Button type="button" variant="submit" onClick={() => setIsEditing(true)}>
                Actualizar datos
              </Button>
            </div>
          </div>
        )}
    </BannerDiv>
  )
}






