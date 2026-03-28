import { create } from 'zustand';

interface CreateProjectState {
  isOpen: boolean;
}

interface CreateProjectActions {
  open: () => void;
  close: () => void;
}

/**
 * Global store for the Create Project Modal.
 *
 * Any component (including the Sidebar's "+ New Project" button) can open
 * the modal by calling `useCreateProjectStore.getState().open()`.
 */
export const useCreateProjectStore = create<CreateProjectState & CreateProjectActions>((set) => ({
  isOpen: false,

  open() {
    set({ isOpen: true });
  },

  close() {
    set({ isOpen: false });
  },
}));
