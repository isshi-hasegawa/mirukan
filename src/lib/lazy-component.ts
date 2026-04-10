import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type ExtractComponent<T> = Extract<T, ComponentType<any>>;

export function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
): LazyExoticComponent<ExtractComponent<TModule[TKey]>> {
  return lazy(async () => ({
    default: (await loader())[key] as ExtractComponent<TModule[TKey]>,
  }));
}
