import { useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"

export function useLogout() {
  const navigate = useNavigate()
  const { logout: logoutFromAuth } = useAuth()

  async function logout() {
    await logoutFromAuth()
    navigate("/login", { replace: true })
  }

  return { logout }
}
