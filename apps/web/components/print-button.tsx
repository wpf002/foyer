'use client';

import { Button } from '@foyer/ui';

export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      Print
    </Button>
  );
}
