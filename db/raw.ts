import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Agenda temporalmente no disponible');return env.DB}
