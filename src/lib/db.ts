import { openDB } from 'idb';

const DB_NAME = 'perfume-inventory';
const DB_VERSION = 1;

export const getDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore('inventory', { keyPath: 'id' });
    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
  },
});
