import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import type { User } from '../types/user'

export function useAuth() {
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: () => authApi.getMe().then(r => r.data).catch(() => null),
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password).then(r => r.data.user),
    onSuccess: (user) => qc.setQueryData(['me'], user),
  })

  const registerMutation = useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authApi.register(email, password, name).then(r => r.data.user),
    onSuccess: (user) => qc.setQueryData(['me'], user),
  })

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => qc.setQueryData(['me'], null),
  })

  return { user, isLoading, loginMutation, registerMutation, logoutMutation }
}
