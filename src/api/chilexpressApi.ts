import { api } from "@/api/client"
import { buildHumanApiErrorMessage } from "@/lib/human-errors"

export type ChilexpressStreet = {
  streetId: number
  streetName: string
  countyName: string
  roadType: string
}

export type ChilexpressRateOption = {
  serviceTypeCode: number
  serviceDescription: string
  didUseVolumetricWeight: boolean
  finalWeight: string
  serviceValue: string
  conditions: string
  deliveryType: number
  additionalServices: unknown[]
}

type StreetSearchPayload = {
  countyName: string
  streetName: string
  pointsOfInterestEnabled?: boolean
  streetNameEnabled?: boolean
  roadType?: number
}

type RatePayload = {
  originCountyCode: string
  destinationCountyCode: string
  package: {
    weight: string
    height: string
    width: string
    length: string
  }
  productType: number
  contentType: number
  declaredWorth: string
  deliveryTime: number
}

const CHILEXPRESS_ORIGIN_COUNTY_CODE = "STGO"

function buildApiErrorMessage(error: unknown, fallback: string) {
  return buildHumanApiErrorMessage(error, fallback)
}

function assertCountyCode(value: string, field: "originCountyCode" | "destinationCountyCode") {
  if (!/^[A-Z0-9]{4}$/.test(value)) {
    throw new Error(`${field} inválido (${value}). Debe ser un código de cobertura de 4 caracteres.`)
  }
}

export function getChilexpressOriginCountyCode() {
  return CHILEXPRESS_ORIGIN_COUNTY_CODE
}

export async function searchChilexpressStreets(payload: StreetSearchPayload, limit = 6) {
  try {
    const { data } = await api.post<{ streets?: ChilexpressStreet[]; error?: string }>(
      "/shipping/streets/search/",
      {
        pointsOfInterestEnabled: false,
        streetNameEnabled: true,
        roadType: 0,
        ...payload,
        limit,
      }
    )

    if (data.error) {
      throw new Error(data.error)
    }

    return data.streets ?? []
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudieron consultar las calles en Chilexpress"))
  }
}

export async function quoteChilexpressRate(payload: Omit<RatePayload, "originCountyCode">) {
  const originCountyCode = CHILEXPRESS_ORIGIN_COUNTY_CODE
  const destinationCountyCode = payload.destinationCountyCode.trim().toUpperCase()
  assertCountyCode(originCountyCode, "originCountyCode")
  assertCountyCode(destinationCountyCode, "destinationCountyCode")

  try {
    const { data } = await api.post<{ options?: ChilexpressRateOption[]; error?: string }>(
      "/shipping/rates/quote/",
      {
        ...payload,
        originCountyCode,
        destinationCountyCode,
      }
    )

    if (data.error) {
      throw new Error(data.error)
    }

    return data.options ?? []
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo cotizar el envío con Chilexpress"))
  }
}
