import { Migration } from '../types';
import { migration001InitialSchema } from './001_initial_schema';

export const migrations: Migration[] = [migration001InitialSchema];
