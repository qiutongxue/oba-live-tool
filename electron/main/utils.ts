export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export type RequiredWith<BaseType, Keys extends keyof BaseType> = Required<Pick<BaseType, Keys>> & Omit<BaseType, Keys>
