import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { DataTable, type Column } from './DataTable';
import { NumberField } from './NumberField';
import { TooltipProvider } from './Tooltip';

describe('Button', () => {
  it('blocks clicks when disabled but stays focusable for its reason tooltip', async () => {
    const onClick = vi.fn();
    render(
      <TooltipProvider>
        <Button disabled disabledReason="Fix 2 fields" onClick={onClick}>
          Run
        </Button>
      </TooltipProvider>,
    );
    const btn = screen.getByRole('button', { name: 'Run' });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    await userEvent.tab();
    expect(btn).toHaveFocus();
    await userEvent.click(btn);
    await userEvent.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('marks loading as busy and inert', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

function Controlled({ onChange }: { onChange: (n: number) => void }) {
  const [v, setV] = useState(100_000);
  return (
    <>
      <NumberField
        label="Agents"
        value={v}
        min={1000}
        max={1_000_000}
        step={1000}
        integer
        unit="agents"
        onChange={(n) => {
          setV(n);
          onChange(n);
        }}
      />
      <button type="button" onClick={() => setV(5000)}>
        reset
      </button>
    </>
  );
}

describe('NumberField', () => {
  it('accepts formatted input, explains invalid input, steps with arrows', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByRole('spinbutton', { name: 'Agents' });

    await userEvent.clear(input);
    await userEvent.type(input, '250,000');
    expect(onChange).toHaveBeenLastCalledWith(250_000);
    expect(input).toHaveValue('250,000'); // no reformat mid-typing

    await userEvent.clear(input);
    await userEvent.type(input, '10');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Must be between 1,000 and 1,000,000');

    await userEvent.click(screen.getByText('reset'));
    expect(input).toHaveValue('5,000');
    expect(input).not.toHaveAttribute('aria-invalid');

    await userEvent.type(input, '{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(6000);
    await userEvent.type(input, '{Shift>}{ArrowUp}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith(16_000);
  });
});

describe('DataTable', () => {
  interface R {
    id: number;
    name: string;
  }
  const columns: Column<R>[] = [
    { id: 'id', header: 'ID', value: (r) => r.id, width: 80, align: 'right' },
    { id: 'name', header: 'Name', value: (r) => r.name, width: 120 },
  ];
  const rows: R[] = [
    { id: 2, name: 'beta' },
    { id: 1, name: 'alpha' },
  ];

  it('sorts via header, filters, reports counts, and shows a no-match state', async () => {
    render(<DataTable label="Demo" rows={rows} columns={columns} />);
    const header = screen.getByRole('columnheader', { name: /ID/ });
    expect(header).toHaveAttribute('aria-sort', 'none');
    await userEvent.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    expect(screen.getByText('2 of 2 rows')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Filter Demo'), 'zzz');
    expect(await screen.findByText('No matching rows')).toBeInTheDocument();
  });

  it('renders loading, error and empty states', () => {
    const { rerender } = render(<DataTable label="T" rows={rows} columns={columns} loading />);
    expect(screen.getByRole('status', { name: 'Loading rows' })).toBeInTheDocument();
    rerender(<DataTable label="T" rows={rows} columns={columns} error="503: engine busy" />);
    expect(screen.getByRole('alert')).toHaveTextContent('503: engine busy');
    rerender(<DataTable label="T" rows={[]} columns={columns} empty={<p>nothing yet</p>} />);
    expect(screen.getByText('nothing yet')).toBeInTheDocument();
  });

  it('resizes a column with the keyboard', async () => {
    render(<DataTable label="T" rows={rows} columns={columns} />);
    const handle = screen.getByRole('separator', { name: 'Resize ID' });
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(handle).toHaveAttribute('aria-valuenow', '96');
  });
});
