## 无法解析 #/..

因为配置了 `@/*` 为 `src/*`，所以用 `#/*` 代替 `electron/main/*`，需要在 vite.config.ts 中配置好 resolve，而且是在 `electron()` 中配置。

```ts
plugins: [
  electron({
    main: {
      vite: {
        resolve: {
          alias: {
            '#': path.join(__dirname, 'electron/main'),
          },
        },
      }
    }
  })
]
```

同样地，tsconfig.json 也要配置一下？

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": [
        "src/*"
      ],
      "#/*": [
        "electron/main/*"
      ]
    }
  }
}
```

## chromium-bidi ++ cjs 问题

因为把 playwright 一起打包了，就会出现这种问题，在 rollupOptions 中配置好 external 就行

在 vite.config.ts 中配置好 external
```ts
plugins: [
  electron({
    main: {
      vite: {
        build: {
          rollupOptions: {
            external: [
              'playwright',
            ],
          },
        },
      }
    }
  })
]
```
