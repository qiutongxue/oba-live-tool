export type PromiseReturnType<T> = T extends Promise<infer U> ? U : T

export type RequiredWith<BaseType, Keys extends keyof BaseType> = Required<Pick<BaseType, Keys>> &
  Omit<BaseType, Keys>
