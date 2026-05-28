import { requestAdmissionEnvelope } from './admission-api'

export function buildInstitutionSnapshotDebugApi(query, envelope, summary = {}) {
  const body = envelope && envelope.body ? envelope.body : {}
  const rawData = body && body.data && typeof body.data === 'object' ? body.data : {}
  const items = Array.isArray(rawData.items) ? rawData.items : []
  const nextData = Object.assign({}, rawData)

  delete nextData.items

  return {
    requestedAt: new Date().toISOString(),
    request: {
      method: (envelope && envelope.method) || 'GET',
      path: (envelope && envelope.path) || '/admission/institutions/full-snapshot',
      url: (envelope && envelope.requestUrl) || '',
      query: Object.assign({}, query || {})
    },
    response: {
      statusCode: Number((envelope && envelope.statusCode) || 0),
      body: {
        code: body.code,
        message: body.message,
        data: Object.assign({}, nextData, {
          itemsCount: items.length,
          itemsPreview: items.slice(0, 2),
          itemsOmittedCount: Math.max(items.length - 2, 0)
        })
      }
    },
    summary: Object.assign({}, summary)
  }
}

export async function requestInstitutionSnapshot(query = {}) {
  const envelope = await requestAdmissionEnvelope('/admission/institutions/full-snapshot', query, { auth: true })
  const data = envelope && envelope.body ? envelope.body.data : {}
  const items = Array.isArray(data && data.items) ? data.items : []
  const total = Math.max(0, Number(data && data.total) || items.length)

  return {
    envelope,
    data: {
      items,
      total,
      generatedAt: String((data && data.generatedAt) || '')
    }
  }
}
