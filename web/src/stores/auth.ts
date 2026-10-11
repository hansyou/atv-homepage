import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client'

export const useAuth = defineStore('auth', () => {
  const authed = ref(false)
  const pending = ref(false)

  async function login(password: string): Promise<void> {
    pending.value = true
    try {
      await api.login(password)
      authed.value = true
    } finally {
      pending.value = false
    }
  }

  async function logout(): Promise<void> {
    await api.logout()
    authed.value = false
  }

  function setAuthed(value: boolean): void {
    authed.value = value
  }

  return { authed, pending, login, logout, setAuthed }
})
