import { requestAdmissionEnvelope } from './admission-api'

export function buildInstitutionListDebugApi(query, envelope, summary = {}) {
  const body = envelope && envelope.body ? envelope.body : {}
  const rawData = body && body.data && typeof body.data === 'object' ? body.data : {}
  const items = Array.isArray(rawData.items) ? rawData.items : []
  const nextData = Object.assign({}, rawData)

  delete nextData.items

  return {
    requestedAt: new Date().toISOString(),
    request: {
      method: (envelope && envelope.method) || 'GET',
      path: (envelope && envelope.path) || '/admission/institutions',
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

export async function requestInstitutionList(query = {}) {
  const envelope = await requestAdmissionEnvelope('/admission/institutions', query, { auth: true })
  const data = envelope && envelope.body ? envelope.body.data : {}
  const items = Array.isArray(data && data.items) ? data.items : []
  const pagination = data && data.pagination && typeof data.pagination === 'object' ? data.pagination : {}
  const total = Math.max(0, Number(pagination && pagination.total) || items.length)
  const page = Math.max(1, Number(pagination && pagination.page) || 1)
  const pageSize = Math.max(1, Number(pagination && pagination.pageSize) || items.length || 1)

  return {
    envelope,
    data: {
      items,
      total,
      page,
      pageSize
    }
  }
}
