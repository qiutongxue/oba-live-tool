interface VersionInfo {
  update: boolean
  version: string
  newVersion?: string
  releaseNote?: string
}

interface ErrorType {
  message: string
  error?: Error
  downloadURL?: string
}
