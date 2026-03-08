export const ADMIN_PASSWORD = 'hyy199877'

export function verifyAdminPassword(input) {
	return (input || '').trim() === ADMIN_PASSWORD
}
