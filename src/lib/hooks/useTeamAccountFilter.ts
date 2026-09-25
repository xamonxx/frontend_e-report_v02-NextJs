import { useEffect, useMemo, useState } from 'react'
import { useAccounts } from '@/lib/hooks/useMasterData'

/**
 * Filter export "pilih Team lalu pilih Akun" dipakai di export Konsul dan
 * export Absensi. Team kosong ('') berarti "Semua Team".
 */
export function useTeamAccountFilter() {
  const { data: accounts } = useAccounts()
  const [team, setTeam] = useState<string>('')
  const [accountIds, setAccountIds] = useState<Set<number>>(new Set())

  const accountsInTeam = useMemo(
    () => (accounts ?? []).filter((account) => !team || account.account_group === team),
    [accounts, team]
  )

  useEffect(() => {
    // Default: semua akun dalam Team yang dipilih tercentang. User boleh
    // uncheck sebagian kalau mau export akun tertentu saja.
    setAccountIds(new Set(accountsInTeam.map((account) => account.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team])

  const toggleAccount = (id: number) => {
    setAccountIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const reset = () => {
    setTeam('')
    setAccountIds(new Set())
  }

  return {
    team,
    setTeam,
    accountsInTeam,
    accountIds,
    toggleAccount,
    reset,
    exportParams: {
      account_group: team || undefined,
      account_ids: accountIds.size ? [...accountIds].join(',') : undefined,
    },
  }
}
