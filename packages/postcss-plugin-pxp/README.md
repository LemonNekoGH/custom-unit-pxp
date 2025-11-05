# postcss-plugin-pxp

A postcss plugin to create a custom unit `pxp` that is a combination of `px` and `var`, it's very useful in game development.

## Install

This package is available on npm, so you can use any package manager that supports npm to install it.

```bash
npm install @lemonneko/postcss-plugin-pxp
# or
yarn add @lemonneko/postcss-plugin-pxp
# or
pnpm add @lemonneko/postcss-plugin-pxp
# or
bun add @lemonneko/postcss-plugin-pxp
```

## Get Started

To use this plugin, you need to add it to your `postcss.config.ts` file.

```ts
import { customUnitPxp } from '@lemonneko/postcss-plugin-pxp'

export default {
  plugins: [
    customUnitPxp('--viewport-width', '1920'),
  ],
}
```

For `vite`, you can add it to your `vite.config.ts` file.

```ts
import { customUnitPxp } from '@lemonneko/postcss-plugin-pxp'
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    transformer: 'postcss',
    postcss: {
      plugins: [
        customUnitPxp('--viewport-width', '1920'),
      ],
    }
  }
})
```

Then in your CSS, you can use the `pxp` unit to set the width of an element, the size of the element will be calculated based on the viewport width and the value of the `pxp` unit.

Example:

```css
.element {
  width: 100pxp;
}
```

This will be transpiled to:

```css
.element {
  width: calc(100px * var(--viewport-width) / 1920);
}
```

Of course, you need to set the `--viewport-width` variable in your CSS.

```css
:root {
  --viewport-width: 1920;
}
```

## Advanced Usage

### Work with Vue

You can use `useCssVar` and `useElementBounding` from `@vueuse/core` to set the value of the `--viewport-width` variable dynamically based on the viewport width.

```ts
import { useCssVar, useElementBounding } from '@vueuse/core'
import { watch } from 'vue'

const viewportWidth = useCssVar('--viewport-width')
const { width } = useElementBounding(document.documentElement)

watch(width, (value) => {
  viewportWidth.value = value
})
```

### Work with UnoCSS

It also works with UnoCSS, just use `[]` to wrap the `pxp` unit, no more configuration needed.

```vue
<template>
  <div class="w-[100pxp]" />
</template>
```

This will be transpiled to:

```css
.w-\[100pxp\] {
  width: calc(100px * var(--viewport-width) / 1920);
}
```
