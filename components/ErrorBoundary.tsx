import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { captureError } from '@/lib/sentry';

type State = { hasError: boolean };

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ hasError: false });

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-bg-base items-center justify-center px-6">
          <Text className="text-text-primary text-2xl font-light mb-2">Something broke.</Text>
          <Text className="text-text-secondary text-sm text-center mb-6">
            We&apos;ve reported it. Try again, and if it keeps happening, restart the app.
          </Text>
          <Pressable
            onPress={this.reset}
            className="bg-accent rounded-full px-6 py-3 active:opacity-70"
          >
            <Text className="text-bg-base text-sm font-semibold">Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
