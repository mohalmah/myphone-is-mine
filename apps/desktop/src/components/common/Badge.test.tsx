import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, LogLevelBadge, SeverityBadge, RiskBadge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies correct variant class for success', () => {
    render(<Badge variant="success">OK</Badge>);
    const el = screen.getByText('OK');
    expect(el.className).toContain('bg-green-100');
  });

  it('applies correct variant class for error', () => {
    render(<Badge variant="error">Fail</Badge>);
    const el = screen.getByText('Fail');
    expect(el.className).toContain('bg-red-100');
  });

  it('applies correct variant class for warning', () => {
    render(<Badge variant="warning">Warn</Badge>);
    const el = screen.getByText('Warn');
    expect(el.className).toContain('bg-yellow-100');
  });

  it('applies sm size by default', () => {
    render(<Badge>Small</Badge>);
    const el = screen.getByText('Small');
    expect(el.className).toContain('text-xs');
  });

  it('applies md size when specified', () => {
    render(<Badge size="md">Medium</Badge>);
    const el = screen.getByText('Medium');
    expect(el.className).toContain('text-sm');
  });
});

describe('LogLevelBadge', () => {
  it('renders V level', () => {
    render(<LogLevelBadge level="V" />);
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('renders E level with error styling', () => {
    render(<LogLevelBadge level="E" />);
    const el = screen.getByText('E');
    expect(el.className).toContain('bg-red-100');
  });

  it('renders I level with success styling', () => {
    render(<LogLevelBadge level="I" />);
    const el = screen.getByText('I');
    expect(el.className).toContain('bg-green-100');
  });

  it('renders W level with warning styling', () => {
    render(<LogLevelBadge level="W" />);
    const el = screen.getByText('W');
    expect(el.className).toContain('bg-yellow-100');
  });
});

describe('SeverityBadge', () => {
  it('renders info severity', () => {
    render(<SeverityBadge severity="info" />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('renders warning severity', () => {
    render(<SeverityBadge severity="warning" />);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders critical severity with error styling', () => {
    render(<SeverityBadge severity="critical" />);
    const el = screen.getByText('Critical');
    expect(el.className).toContain('bg-red-100');
  });
});

describe('RiskBadge', () => {
  it('renders safe risk with success styling', () => {
    render(<RiskBadge risk="safe" />);
    const el = screen.getByText('Safe');
    expect(el.className).toContain('bg-green-100');
  });

  it('renders high risk with error styling', () => {
    render(<RiskBadge risk="high" />);
    const el = screen.getByText('High');
    expect(el.className).toContain('bg-red-100');
  });
});
