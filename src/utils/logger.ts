const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: any[]) => { if (isDev) console.log(...args); },
  warn: (...args: any[]) => { if (isDev) console.warn(...args); },
  error: (...args: any[]) => console.error(...args),
};
