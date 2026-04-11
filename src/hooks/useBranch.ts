// Re-export from BranchContext for backwards compatibility
// POS and Mesero import from here — gives them the full branch context
import { useBranch as useBranchContext, BranchProvider } from '@/contexts/BranchContext';
export { BranchProvider };

export function useBranch() {
  const ctx = useBranchContext();
  return {
    // Legacy shape used by POS (branch) and Mesero (branchId)
    branch: ctx.activeBranchId,
    branchId: ctx.activeBranchId,
    // Full context
    activeBranchId: ctx.activeBranchId,
    activeBranchName: ctx.activeBranchName,
    branches: ctx.branches,
    canSwitch: ctx.canSwitch,
    setActiveBranch: ctx.setActiveBranch,
  };
}
