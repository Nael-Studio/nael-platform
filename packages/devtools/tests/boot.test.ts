import { describe, expect, it } from 'bun:test';
import { renderDashboardHtml } from '../src/http/dashboard-html';

describe('boot dashboard tab', () => {
  it('renders a Boot tab backed by /api/boot', () => {
    const html = renderDashboardHtml({ basePath: '/__nael', title: 'Nael DevTools' });
    expect(html).toContain('data-tab="boot"');
    expect(html).toContain('id="tab-boot"');
    expect(html).toContain('function renderBoot');
    expect(html).toContain('/api/boot');
  });
});
