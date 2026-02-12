import { nanoid } from 'nanoid';

/** Generate a short unique identifier (10 characters). */
export const generateId = (): string => nanoid(10);
