/// <reference types="vite/client" />

declare module "*.css" {
  const css: string;
  export default css;
}

declare module "./style.css" {
  export {};
}

declare module "@fontsource-variable/geist" {
  export {};
}
