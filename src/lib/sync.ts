import { getDB } from './db';

export async function syncPendingOperations() {
  const db = await getDB();
  const operations = await db.getAll('syncQueue');
  for (const op of operations) {
    try {
      // Replace with your API endpoint
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op.item),
      });
      await db.delete('syncQueue', op.id);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }
}
