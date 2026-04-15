import { Component, Suspense, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  errorFallback: ReactNode;
  resetKey?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class LazyErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("遅延読み込みに失敗しました", error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.errorFallback;
    }

    return this.props.children;
  }
}

type Props = Readonly<{
  children: ReactNode;
  loadingFallback: ReactNode;
  errorFallback?: ReactNode;
  resetKey?: string;
}>;

export function LazyViewBoundary({
  children,
  loadingFallback,
  errorFallback = loadingFallback,
  resetKey,
}: Props) {
  return (
    <LazyErrorBoundary errorFallback={errorFallback} resetKey={resetKey}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </LazyErrorBoundary>
  );
}
