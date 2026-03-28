import { create } from 'zustand';

interface QuickCaptureState {
  /** Whether the modal is currently open. */
  isOpen: boolean;
  /** Content to pre-fill in the textarea (e.g. from the empty-state CTA). */
  prefilledContent: string;
  /** Project to pre-select and lock (e.g. when capturing from a Project's Ideas Tab). */
  prefilledProjectId: string | null;
  /** Whether the project selector should be locked (not changeable by the user). */
  lockProject: boolean;
}

interface QuickCaptureActions {
  /** Open the modal, optionally pre-filling content / locking a project. */
  open: (opts?: { content?: string; projectId?: string; lockProject?: boolean }) => void;
  /** Close and reset the modal. */
  close: () => void;
}

const initialState: QuickCaptureState = {
  isOpen: false,
  prefilledContent: '',
  prefilledProjectId: null,
  lockProject: false,
};

/**
 * Global store for the Quick Capture Modal.
 *
 * Any component can open the modal (optionally with pre-filled content or a
 * locked project) by calling `useQuickCaptureStore.getState().open(opts)`.
 */
export const useQuickCaptureStore = create<QuickCaptureState & QuickCaptureActions>((set) => ({
  ...initialState,

  open(opts) {
    set({
      isOpen: true,
      prefilledContent: opts?.content ?? '',
      prefilledProjectId: opts?.projectId ?? null,
      lockProject: opts?.lockProject ?? false,
    });
  },

  close() {
    set(initialState);
  },
}));
