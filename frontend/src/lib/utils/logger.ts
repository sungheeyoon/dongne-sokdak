/**
 * Development-only logger
 */
export const debugLog = (message?: any, ...optionalParams: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    if (process.env.NODE_ENV === 'development') console.log(message, ...optionalParams)
  }
}
