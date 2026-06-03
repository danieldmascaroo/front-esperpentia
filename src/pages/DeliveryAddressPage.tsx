import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, LoaderCircle, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { convertCart, createCustomerAddress, createPaymentIntent, getOrCreateGuestToken } from "@/api/commerceApi"
import { useAuth } from "@/auth/useAuth"
import { useCart } from "@/commerce/useCart"
import { quoteChilexpressRate, searchChilexpressStreets, type ChilexpressStreet } from "@/api/chilexpressApi"
import { formActionButtonClassName, formInputClassName } from "@/components/form-styles"
import { PurchaseForm, PurchaseFormRow } from "@/components/PurchaseForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency, getCartBookCount, getChilexpressPackageForBooks } from "@/lib/cart"
import { getComunas, getRegions } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Comuna, PaymentIntent, Region } from "@/pages/types"

type SearchableOption = {
  value: string
  label: string
}

type SearchableLineSelectProps = {
  id: string
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  emptyMessage: string
  disabled?: boolean
  loading?: boolean
}

function SearchableLineSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage,
  disabled = false,
  loading = false,
}: SearchableLineSelectProps) {
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
        className={formInputClassName}
        value={isOpen ? query : selectedOption?.label ?? query}
        placeholder={placeholder}
        autoComplete="off"
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
        <div className="absolute top-full z-50 mt-2 max-h-64 w-full overflow-y-auto border border-border/70 bg-background p-1 shadow-md">
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
                  "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent/30",
                  value === option.value ? "bg-accent/50 text-foreground" : "text-foreground"
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

function getWebpayRedirectTarget(paymentIntent: PaymentIntent) {
  let webpayUrl = paymentIntent.webpay_url ?? ""
  let token = paymentIntent.token ?? paymentIntent.provider_reference ?? ""

  if (!webpayUrl && paymentIntent.redirect_url) {
    try {
      const parsedUrl = new URL(paymentIntent.redirect_url)
      token = token || parsedUrl.searchParams.get("token_ws") || ""
      parsedUrl.searchParams.delete("token_ws")
      webpayUrl = parsedUrl.toString()
    } catch {
      webpayUrl = paymentIntent.redirect_url
    }
  }

  return { webpayUrl, token }
}

function submitWebpayPost(webpayUrl: string, token: string) {
  const form = document.createElement("form")
  form.method = "POST"
  form.action = webpayUrl
  form.style.display = "none"

  const tokenInput = document.createElement("input")
  tokenInput.type = "hidden"
  tokenInput.name = "token_ws"
  tokenInput.value = token

  form.appendChild(tokenInput)
  document.body.appendChild(form)
  form.submit()
}

export function DeliveryAddressPage() {
  const { isAuthenticated, user } = useAuth()
  const { cart, refreshCart } = useCart()
  const [regions, setRegions] = useState<Region[]>([])
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingComunas, setLoadingComunas] = useState(false)
  const [loadingStreets, setLoadingStreets] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [regionId, setRegionId] = useState("")
  const [comunaId, setComunaId] = useState("")
  const [streetQuery, setStreetQuery] = useState("")
  const [streetNumber, setStreetNumber] = useState("")
  const [streets, setStreets] = useState<ChilexpressStreet[]>([])
  const [selectedStreet, setSelectedStreet] = useState<ChilexpressStreet | null>(null)
  const [guestName, setGuestName] = useState("")
  const [guestLastName, setGuestLastName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [shippingAmount, setShippingAmount] = useState<number | null>(null)
  const [loadingShippingQuote, setLoadingShippingQuote] = useState(false)
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null)
  const [isStartingPayment, setIsStartingPayment] = useState(false)

  const selectedComuna = useMemo(
    () => comunas.find((comuna) => String(comuna.id) === comunaId) ?? null,
    [comunaId, comunas]
  )
  const normalizedStreetQuery = streetQuery.trim()
  const isStreetValidated = Boolean(
    selectedStreet &&
    normalizedStreetQuery.toUpperCase() === selectedStreet.streetName.trim().toUpperCase()
  )

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
        setError(err instanceof Error ? err.message : "No se pudieron cargar las regiones")
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
    setComunaId("")
    setStreetQuery("")
    setStreetNumber("")
    setStreets([])
    setSelectedStreet(null)

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
        setError(err instanceof Error ? err.message : "No se pudieron cargar las comunas")
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
  }, [regionId])

  useEffect(() => {
    setStreetQuery("")
    setStreetNumber("")
    setStreets([])
    setSelectedStreet(null)
  }, [comunaId])

  useEffect(() => {
    let active = true

    const activeCart = cart
    const destinationCountyCode = selectedComuna?.county_code?.trim().toUpperCase() ?? ""
    const hasValidDestinationCountyCode = /^[A-Z0-9]{4}$/.test(destinationCountyCode)

    if (!hasValidDestinationCountyCode || !activeCart || activeCart.items.length === 0) {
      setShippingAmount(null)
      setShippingQuoteError(
        selectedComuna && !hasValidDestinationCountyCode
          ? "La comuna seleccionada no tiene un código de cobertura valido para cotizar."
          : null
      )
      setLoadingShippingQuote(false)
      return () => {
        active = false
      }
    }

    const bookCount = getCartBookCount(activeCart)
    const { package: packageForQuote } = getChilexpressPackageForBooks(bookCount)
    const declaredWorth = Math.max(Number(activeCart.total_amount) || 0, 1)

    setLoadingShippingQuote(true)
    setShippingQuoteError(null)

    void quoteChilexpressRate({
      destinationCountyCode,
      package: packageForQuote,
      productType: 3,
      contentType: 1,
      declaredWorth: String(Math.round(declaredWorth)),
      deliveryTime: 0,
    })
      .then((options) => {
        if (!active) {
          return
        }

        const available = options
          .map((option) => {
            const amount = Number(option.serviceValue)
            return {
              amount: Number.isFinite(amount) ? amount : NaN,
              service: option.serviceDescription,
            }
          })
          .filter((option) => Number.isFinite(option.amount) && option.amount >= 0)

        if (!available.length) {
          setShippingAmount(null)
          setShippingQuoteError("No encontramos tarifas de envío para esta comuna.")
          return
        }

        const cheapestOption = available.reduce((best, current) =>
          current.amount < best.amount ? current : best
        )

        setShippingAmount(cheapestOption.amount)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setShippingAmount(null)
        setShippingQuoteError(err instanceof Error ? err.message : "No se pudo cotizar el envío para esta comuna.")
      })
      .finally(() => {
        if (active) {
          setLoadingShippingQuote(false)
        }
      })

    return () => {
      active = false
    }
  }, [cart, selectedComuna])

  const regionOptions = useMemo(
    () => regions.map((region) => ({ value: String(region.id), label: region.nombre })),
    [regions]
  )
  const comunaOptions = useMemo(
    () => comunas.map((comuna) => ({ value: String(comuna.id), label: comuna.nombre })),
    [comunas]
  )

  useEffect(() => {
    if (!selectedStreet) {
      return
    }

    const normalizedSelectedStreet = selectedStreet.streetName.trim().toUpperCase()
    if (normalizedStreetQuery.toUpperCase() !== normalizedSelectedStreet) {
      setSelectedStreet(null)
    }
  }, [normalizedStreetQuery, selectedStreet])

  useEffect(() => {
    let active = true

    if (!selectedComuna || normalizedStreetQuery.length < 4) {
      setLoadingStreets(false)
      setStreets([])
      return () => {
        active = false
      }
    }

    const timeoutId = window.setTimeout(() => {
      setLoadingStreets(true)

      void searchChilexpressStreets({
        countyName: selectedComuna.nombre.toUpperCase(),
        streetName: normalizedStreetQuery.toUpperCase(),
      })
        .then((data) => {
          if (!active) {
            return
          }
          setStreets(data)
        })
        .catch((err) => {
          if (!active) {
            return
          }
          setStreets([])
          setError(err instanceof Error ? err.message : "No se pudo validar la calle")
        })
        .finally(() => {
          if (active) {
            setLoadingStreets(false)
          }
        })
    }, 400)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [normalizedStreetQuery, selectedComuna])

  const regionProgress = regionId ? 1 : 0
  const comunaProgress = comunaId ? 1 : 0
  const streetProgress = selectedStreet ? 1 : 0
  const numberProgress = streetNumber.trim().length > 0 ? 1 : 0
  const totalProgress = regionProgress + comunaProgress + streetProgress + numberProgress
  const cartSubtotalAmount = Number(cart?.subtotal_amount ?? 0)
  const cartTotalAmount = Number(cart?.total_amount ?? 0)
  const totalWithShipping =
    selectedComuna && !loadingShippingQuote && shippingAmount !== null
      ? cartTotalAmount + shippingAmount
      : null
  const normalizedGuestPhone = guestPhone.replace(/\s+/g, "")
  const isGuestEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())
  const isGuestPhoneValid = /^[+0-9()\-]{8,20}$/.test(normalizedGuestPhone)
  const isGuestContactComplete = isAuthenticated
    ? true
    : guestName.trim().length >= 2 &&
      guestLastName.trim().length >= 2 &&
      isGuestPhoneValid &&
      isGuestEmailValid

  async function handleContinueToPayment() {
    setError(null)

    setIsStartingPayment(true)
    try {
      const guestToken = isAuthenticated ? undefined : getOrCreateGuestToken()
      const activeCart = cart ?? (await refreshCart())
      if (!activeCart || activeCart.items.length === 0) {
        throw new Error("Tu carrito esta vacio. Vuelve al carrito y agrega productos.")
      }
      if (!selectedComuna || !selectedStreet || !streetNumber.trim()) {
        throw new Error("Completa region, comuna, calle y numero antes de continuar.")
      }
      if (!isAuthenticated) {
        if (guestName.trim().length < 2) {
          throw new Error("Debes ingresar un nombre.")
        }
        if (guestLastName.trim().length < 2) {
          throw new Error("Debes ingresar tu apellido.")
        }
        if (!isGuestPhoneValid) {
          throw new Error("Ingresa un teléfono válido.")
        }
        if (!isGuestEmailValid) {
          throw new Error("Ingresa un email válido.")
        }
      }

      if (isAuthenticated) {
        await createCustomerAddress({
          address: `${selectedStreet.streetName} ${streetNumber.trim()}`.trim(),
          city: selectedComuna.nombre,
          region: regions.find((region) => String(region.id) === regionId)?.nombre ?? "",
          country: "Chile",
          postal_code: selectedComuna.county_code ?? "000000",
        })
      }

      const shippingRegion = regions.find((region) => String(region.id) === regionId)?.nombre ?? ""
      const shippingAddress = `${selectedStreet.streetName} ${streetNumber.trim()}`.trim()
      const conversion = await convertCart(activeCart.id, guestToken, {
        contact_first_name: isAuthenticated ? (user?.nombre ?? "") : guestName.trim(),
        contact_last_name: isAuthenticated ? (user?.apellido ?? "") : guestLastName.trim(),
        contact_email: isAuthenticated ? (user?.email ?? "") : guestEmail.trim(),
        contact_phone: isAuthenticated ? "" : normalizedGuestPhone,
        shipping_address: shippingAddress,
        shipping_city: selectedComuna.nombre,
        shipping_region: shippingRegion,
        shipping_postal_code: selectedComuna.county_code ?? "0000",
        shipping_country: "Chile",
      })
      const paymentIntent = await createPaymentIntent(conversion.order_id, "webpay", guestToken)
      const { webpayUrl, token } = getWebpayRedirectTarget(paymentIntent)
      if (!webpayUrl || !token) {
        throw new Error("Webpay no devolvio una URL de redirección valida.")
      }

      submitWebpayPost(webpayUrl, token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago con Webpay.")
      setIsStartingPayment(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1 border-b border-border/70 pb-3 text-center">
        <p className="text-2xl font-semibold text-foreground sm:text-3xl">Entrega</p>
        <h1 className="text-sm font-normal text-muted-foreground sm:text-base">
          Completa tu dirección para continuar con el despacho
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <div className="border-y border-border/70 py-3">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Progreso del formulario</span>
              <span className="text-muted-foreground">{totalProgress}/4 completado</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[regionProgress, comunaProgress, streetProgress, numberProgress].map((step, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-colors",
                    step ? "bg-emerald-500" : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>

          {!isAuthenticated ? (
            <PurchaseForm>
              <PurchaseFormRow
                label="Datos de contacto"
                description=""
              >
                <Input
                  id="guest-name"
                  className={formInputClassName}
                  value={guestName}
                  autoComplete="given-name"
                  placeholder="Nombre"
                  onChange={(event) => {
                    setError(null)
                    setGuestName(event.target.value)
                  }}
                />
                <Input
                  id="guest-last-name"
                  className={formInputClassName}
                  value={guestLastName}
                  autoComplete="family-name"
                  placeholder="Apellido"
                  onChange={(event) => {
                    setError(null)
                    setGuestLastName(event.target.value)
                  }}
                />
                <Input
                  id="guest-phone"
                  className={formInputClassName}
                  value={guestPhone}
                  autoComplete="tel"
                  placeholder="teléfono de contacto"
                  onChange={(event) => {
                    setError(null)
                    setGuestPhone(event.target.value)
                  }}
                />
                <Input
                  id="guest-email"
                  type="email"
                  className={formInputClassName}
                  value={guestEmail}
                  autoComplete="email"
                  placeholder="Email de contacto"
                  onChange={(event) => {
                    setError(null)
                    setGuestEmail(event.target.value)
                  }}
                />
              </PurchaseFormRow>
            </PurchaseForm>
          ) : null}

          <PurchaseForm>
            <PurchaseFormRow
              label="Region"
              description={
                loadingRegions ? (
                  <span className="mt-1 inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    <span>Cargando regiones...</span>
                  </span>
                ) : null
              }
            >
              <SearchableLineSelect
                id="region"
                value={regionId}
                onChange={(nextValue) => {
                  setError(null)
                  setRegionId(nextValue)
                }}
                options={regionOptions}
                placeholder={loadingRegions ? "Cargando regiones..." : "Escribe o selecciona una region"}
                emptyMessage="No hay regiones que coincidan."
                disabled={loadingRegions}
                loading={loadingRegions}
              />
            </PurchaseFormRow>

            {regionId ? (
              <PurchaseFormRow
                label="Comuna"
                description={
                  loadingComunas ? (
                    <span className="mt-1 inline-flex items-center gap-2">
                      <Spinner className="size-4" />
                      <span>Cargando comunas...</span>
                    </span>
                  ) : null
                }
              >
                <SearchableLineSelect
                  id="comuna"
                  value={comunaId}
                  onChange={(nextValue) => {
                    setError(null)
                    setComunaId(nextValue)
                  }}
                  options={comunaOptions}
                  placeholder={loadingComunas ? "Cargando comunas..." : "Escribe o selecciona una comuna"}
                  emptyMessage="No hay comunas que coincidan."
                  disabled={loadingComunas}
                  loading={loadingComunas}
                />
              </PurchaseFormRow>
            ) : null}

            {comunaId ? (
              <PurchaseFormRow label="Calle" description="">
                <div className="relative">
                  <Input
                    id="street"
                    className={`${formInputClassName} pr-8`}
                    value={streetQuery}
                    autoComplete="street-address"
                    placeholder="Escribe el nombre de tu calle"
                    onChange={(event) => {
                      setError(null)
                      setStreetQuery(event.target.value)
                    }}
                  />
                  {isStreetValidated ? (
                    <CheckCircle2 className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2 text-emerald-600" />
                  ) : null}
                </div>

                {!isStreetValidated ? (
                  <div className="mt-2 border-y border-border/70">
                    {normalizedStreetQuery.length < 4 ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                        <MapPin className="size-4" />
                      </div>
                    ) : loadingStreets ? (
                      <div className="space-y-2 px-3 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <LoaderCircle className="size-4 animate-spin" />
                          <span>Buscando calles...</span>
                        </div>
                        <div className="h-2 animate-pulse rounded bg-muted" />
                        <div className="h-2 w-5/6 animate-pulse rounded bg-muted" />
                      </div>
                    ) : streets.length > 0 ? (
                      <ul className="max-h-60 divide-y divide-border/70 overflow-y-auto">
                        {streets.map((street) => {
                          const isSelected = selectedStreet?.streetId === street.streetId

                          return (
                            <li key={street.streetId}>
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                                  "hover:bg-accent/30",
                                  isSelected ? "bg-accent/50 text-foreground" : "text-foreground"
                                )}
                                onClick={() => {
                                  setSelectedStreet(street)
                                  setStreetQuery(street.streetName)
                                }}
                              >
                                <span>{street.roadType} {street.streetName}</span>
                                {isSelected ? <CheckCircle2 className="size-4 text-emerald-500" /> : null}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No encontramos coincidencias para esa calle en {selectedComuna?.nombre}.
                      </div>
                    )}
                  </div>
                ) : null}

                <Input
                  id="street-number"
                  className={formInputClassName}
                  value={streetNumber}
                  inputMode="numeric"
                  autoComplete="address-line2"
                  placeholder="Numero de calle"
                  onChange={(event) => {
                    setError(null)
                    setStreetNumber(event.target.value)
                  }}
                />
              </PurchaseFormRow>
            ) : null}
          </PurchaseForm>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" className={formActionButtonClassName} nativeButton={false} render={<Link to="/checkout" />}>
              <ArrowLeft className="size-4" />
              Volver al carrito
            </Button>

            <Button variant="black" className={formActionButtonClassName} disabled={!selectedStreet || !streetNumber.trim() || !isGuestContactComplete || isStartingPayment} onClick={() => void handleContinueToPayment()}>
              {isStartingPayment ? "Redirigiendo a Webpay..." : "Pagar con Webpay"}
            </Button>
          </div>
        </div>

        <Card className="h-fit rounded-3xl lg:sticky lg:top-6">
          <CardHeader className="space-y-2 border-b border-border/70 pb-4">
            <CardTitle className="text-lg">Resumen de compra</CardTitle>
            <p className="text-sm text-muted-foreground">
              {getCartBookCount(cart)} {getCartBookCount(cart) === 1 ? "libro" : "libros"} en tu carrito.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(cartSubtotalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Despacho</span>
              {selectedComuna && loadingShippingQuote ? (
                <Spinner className="size-4 text-muted-foreground" />
              ) : shippingAmount !== null ? (
                <span className="font-medium">{formatCurrency(shippingAmount)}</span>
              ) : (
                <span className="text-muted-foreground">
                  {selectedComuna ? "Sin cotizacion" : "Selecciona comuna"}
                </span>
              )}
            </div>
            {shippingQuoteError ? (
              <p className="text-xs text-destructive">{shippingQuoteError}</p>
            ) : null}
            <div className="flex items-center justify-between border-t border-border/70 pt-3 text-base">
              <span className="font-semibold">Total con envío</span>
              {!selectedComuna ? (
                <span className="text-sm font-medium text-muted-foreground">Selecciona comuna</span>
              ) : loadingShippingQuote ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Spinner className="size-4" />
                </span>
              ) : totalWithShipping !== null ? (
                <span className="font-semibold">{formatCurrency(totalWithShipping)}</span>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">Sin cotizacion</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}



