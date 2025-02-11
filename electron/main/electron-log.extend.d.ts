import 'electron-log'

declare module 'electron-log' {
  interface LogFunctions {
    success: (...params: any[]) => void
  }
}
