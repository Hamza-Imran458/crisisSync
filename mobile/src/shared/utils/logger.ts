declare const __DEV__: boolean | undefined;

export const logger = {
  info: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('[ERROR]', ...args);
    }
  }
};
