export const logger = {
  info: (message: string, ...args: any[]) => {
    const time = new Date().toISOString();
    console.log(`\x1b[36m[INFO]\x1b[0m [${time}] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    const time = new Date().toISOString();
    console.warn(`\x1b[33m[WARN]\x1b[0m [${time}] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    const time = new Date().toISOString();
    console.error(`\x1b[31m[ERROR]\x1b[0m [${time}] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      const time = new Date().toISOString();
      console.debug(`\x1b[90m[DEBUG]\x1b[0m [${time}] ${message}`, ...args);
    }
  }
};
