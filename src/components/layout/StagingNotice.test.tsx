import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../../config/env');
});

async function renderWith(isStaging: boolean) {
  vi.doMock('../../config/env', () => ({ serverEnv: { isStaging, siteUrl: '' }, env: { useMockApi: true, apiBaseUrl: '', apiTimeoutMs: 1000 } }));
  const { StagingNotice } = await import('./StagingNotice');
  return render(<StagingNotice />);
}

describe('StagingNotice', () => {
  it('asks reviewers to use test details on the staging build', async () => {
    await renderWith(true);
    const notice = screen.getByRole('complementary', { name: 'Staging site notice' });
    expect(notice).toHaveTextContent(/use test details/);
    expect(notice).toHaveTextContent(/not appointments/);
    expect(notice).toHaveTextContent(/emails go to the address you enter/);
  });

  it('is absent from local and production builds', async () => {
    const { container } = await renderWith(false);
    expect(container).toBeEmptyDOMElement();
  });
});
