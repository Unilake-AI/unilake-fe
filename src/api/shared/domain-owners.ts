import { http } from '@/api/http'

export interface DomainOwnerGrant {
  grant_id: string
  domain: string
  user_id: number
}

const path = '/pipeline/profiles/owners/grants'

export async function listDomainOwnerGrants() {
  const { data } = await http.get<DomainOwnerGrant[]>(path)
  return data
}

export async function grantDomainOwner(domain: string, userId: number, reason: string) {
  await http.post(path, { domain, user_id: userId, reason })
}

export async function revokeDomainOwner(grantId: string, reason: string) {
  await http.post(`${path}/${encodeURIComponent(grantId)}/revoke`, { reason })
}
