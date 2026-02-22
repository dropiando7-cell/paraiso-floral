import { getVaultItems } from './actions'
import { VaultClient } from './VaultClient'

export const dynamic = 'force-dynamic'

export default async function PasswordVaultPage() {
    // Fetch data from the database
    const initialItems = await getVaultItems()

    return (
        <VaultClient initialItems={initialItems} />
    )
}
