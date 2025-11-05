# vue-plugin-pxp

A Vue plugin to introduce the `v-style-pxp` directive to bind inline styles with `pxp` unit and transform it, it's very useful when you have a lot of inline styles with `pxp` unit.

## Install

This package is available on npm, so you can use any package manager that supports npm to install it.

```bash
npm install @lemonneko/vue-plugin-pxp
# or
yarn add @lemonneko/vue-plugin-pxp
# or
pnpm add @lemonneko/vue-plugin-pxp
# or
bun add @lemonneko/vue-plugin-pxp
```

## Get Started

To use this plugin, you need to install it and use it in your Vue app.

```ts
import { usePxp } from '@lemonneko/vue-plugin-pxp'
import { createApp } from 'vue'

const app = createApp({})
app.use(usePxp('--viewport-width', '1920'))
```

Then you can use the `v-style-pxp` directive to bind inline styles with `pxp` unit.

```vue
<template>
  <div v-style-pxp="{ width: '100pxp' }" />
</template>
```

Of course, you need to set the `--viewport-width` variable in your CSS.

```css
:root {
  --viewport-width: 1920;
}
```

## Advanced Usage

The same as the postcss plugin, you can use `useCssVar` and `useElementBounding` from `@vueuse/core` to set the value of the `--viewport-width` variable dynamically based on the viewport width.

```ts
import { useCssVar, useElementBounding } from '@vueuse/core'
import { watch } from 'vue'

const viewportWidth = useCssVar('--viewport-width')
const { width } = useElementBounding(document.documentElement)

watch(width, (value) => {
  viewportWidth.value = value
})
```
