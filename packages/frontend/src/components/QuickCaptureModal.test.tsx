import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QuickCaptureModal } from './QuickCaptureModal.js';
import { useQuickCaptureStore } from '../store/quick-capture-store.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn();
const mockReset = vi.fn();

vi.mock('../api/hooks/ideas.js', () => ({
  useCreateIdea: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    reset: mockReset,
  }),
}));

vi.mock('../api/hooks/projects.js', () => ({
  useProjects: () => ({
    data: {
      data: [
        { id: 'p1', title: 'My Heist Film' },
        { id: 'p2', title: 'Road Trip Drama' },
      ],
    },
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openModal(opts?: { content?: string; projectId?: string; lockProject?: boolean }) {
  useQuickCaptureStore.getState().open(opts);
}

function renderModal() {
  return render(
    <MemoryRouter>
      <QuickCaptureModal />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Reset global store to closed state before each test
  useQuickCaptureStore.setState({ isOpen: false, prefilledContent: '', prefilledProjectId: null, lockProject: false });
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickCaptureModal', () => {
  it('renders nothing when the modal is closed', () => {
    renderModal();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the modal when open', () => {
    openModal();
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Capture an idea')).toBeInTheDocument();
  });

  it('Save button is disabled when content is empty', () => {
    openModal();
    renderModal();
    const saveBtn = screen.getByRole('button', { name: /save idea/i });
    expect(saveBtn).toBeDisabled();
  });

  it('Save button becomes enabled once content is typed', async () => {
    openModal();
    renderModal();
    const textarea = screen.getByLabelText(/idea content/i);
    await userEvent.type(textarea, 'What if the detective is the murderer?');
    expect(screen.getByRole('button', { name: /save idea/i })).not.toBeDisabled();
  });

  it('Escape key closes the modal', () => {
    openModal();
    renderModal();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(useQuickCaptureStore.getState().isOpen).toBe(false);
  });

  it('clicking the backdrop closes the modal', () => {
    openModal();
    renderModal();
    const backdrop = screen.getByRole('dialog');
    // Click the outermost backdrop element (not inner content)
    fireEvent.click(backdrop);
    expect(useQuickCaptureStore.getState().isOpen).toBe(false);
  });

  it('"No type yet" pill is active by default', () => {
    openModal();
    renderModal();
    const noTypePill = screen.getByRole('button', { name: /no type yet/i });
    expect(noTypePill).toHaveAttribute('aria-pressed', 'true');
  });

  it('selecting a type pill marks it as active', async () => {
    openModal();
    renderModal();
    const whatIfPill = screen.getByRole('button', { name: /^what if$/i });
    await userEvent.click(whatIfPill);
    expect(whatIfPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /no type yet/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls createIdea with type: undefined when "No type yet" is selected', async () => {
    mockMutateAsync.mockResolvedValue({ data: { id: 'idea-1' } });
    openModal();
    renderModal();

    await userEvent.type(screen.getByLabelText(/idea content/i), 'A great idea');
    await userEvent.click(screen.getByRole('button', { name: /save idea/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: undefined })
      );
    });
  });

  it('passes the selected type to createIdea', async () => {
    mockMutateAsync.mockResolvedValue({ data: { id: 'idea-2' } });
    openModal();
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: /^what if$/i }));
    await userEvent.type(screen.getByLabelText(/idea content/i), 'Big question');
    await userEvent.click(screen.getByRole('button', { name: /save idea/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'WHAT_IF' })
      );
    });
  });

  it('splits comma-separated tags into an array', async () => {
    mockMutateAsync.mockResolvedValue({ data: { id: 'idea-3' } });
    openModal();
    renderModal();

    await userEvent.type(screen.getByLabelText(/idea content/i), 'Tag test idea');
    await userEvent.type(screen.getByLabelText(/tags/i), 'heist, thriller ,ensemble');
    await userEvent.click(screen.getByRole('button', { name: /save idea/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['heist', 'thriller', 'ensemble'] })
      );
    });
  });

  it('keeps modal open and shows error toast on failure', async () => {
    const toast = await import('react-hot-toast');
    mockMutateAsync.mockRejectedValue(new Error('Server error'));
    openModal();
    renderModal();

    await userEvent.type(screen.getByLabelText(/idea content/i), 'Will fail');
    await userEvent.click(screen.getByRole('button', { name: /save idea/i }));

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(
        'Failed to save idea — please try again.'
      );
    });
    // Modal stays open, content preserved
    expect(useQuickCaptureStore.getState().isOpen).toBe(true);
    expect(screen.getByLabelText(/idea content/i)).toHaveValue('Will fail');
  });

  it('pre-fills content from the store when opened with content', () => {
    openModal({ content: 'Pre-filled content here' });
    renderModal();
    expect(screen.getByLabelText(/idea content/i)).toHaveValue('Pre-filled content here');
  });

  it('pre-selects the project when opened with a projectId', () => {
    openModal({ projectId: 'p1' });
    renderModal();
    expect(screen.getByLabelText(/project/i)).toHaveValue('p1');
  });

  it('locks the project selector when lockProject is true', () => {
    openModal({ projectId: 'p1', lockProject: true });
    renderModal();
    expect(screen.getByLabelText(/project/i)).toBeDisabled();
  });

  it('shows all 8 type pill options', () => {
    openModal();
    renderModal();
    const expected = [
      'No type yet', 'What If', 'Character', 'Setting',
      'First Line', 'Scene', 'Theme', 'News Flash',
    ];
    for (const label of expected) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })
      ).toBeInTheDocument();
    }
  });

  it('shows the project selector when projects exist', () => {
    openModal();
    renderModal();
    expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
  });

  it('closes the modal after successful save', async () => {
    mockMutateAsync.mockResolvedValue({ data: { id: 'idea-ok' } });
    openModal();
    renderModal();

    await userEvent.type(screen.getByLabelText(/idea content/i), 'Success case');
    await userEvent.click(screen.getByRole('button', { name: /save idea/i }));

    await waitFor(() => {
      expect(useQuickCaptureStore.getState().isOpen).toBe(false);
    });
  });
});
