interface Abortable {
  abortSignal?: AbortSignal
}

export function abortable<This extends Abortable, Args extends unknown[], Return>(
  originalMethod: (...args: Args) => Promise<Return> | Return,
  _context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Promise<Return> | Return
  >,
) {
  return async function (this: This, ...args: Args) {
    const signal = this.abortSignal
    if (!signal) {
      return originalMethod.apply(this, args)
    }
    if (signal.aborted) {
      throw new Error('强制终止')
    }
    return (await Promise.race([
      originalMethod.apply(this, args),
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('强制终止')))
      }),
    ])) as Return
  }
}
