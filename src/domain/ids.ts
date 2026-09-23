import { randomUUID } from 'node:crypto';
export const id = (prefix:string) => `${prefix}_${randomUUID()}`;
export const now = () => new Date().toISOString();
