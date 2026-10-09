import { TriangleAlert } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/** One per screen: a crash in one screen never blanks the shell. */
export class ErrorBoundary extends Component<
  { screen: string; children: ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error) {
    console.error(`[${this.props.screen}]`, error);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <EmptyState
        tone="danger"
        className="h-full"
        icon={<TriangleAlert className="size-5" strokeWidth={1.5} />}
        title={`${this.props.screen} crashed`}
        description={`${error.name}: ${error.message}. Your other screens and any running jobs are unaffected.`}
        action={<Button onClick={() => this.setState({ error: null })}>Reload screen</Button>}
      />
    );
  }
}
