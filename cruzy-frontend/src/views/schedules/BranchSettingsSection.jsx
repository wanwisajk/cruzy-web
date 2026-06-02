import { BranchDeleteConfirm } from '../../features/branches/components/BranchDeleteConfirm';
import { BranchFilters } from '../../features/branches/components/BranchFilters';
import { BranchModal } from '../../features/branches/components/BranchModal';
import { BranchStats } from '../../features/branches/components/BranchStats';
import { BranchToasts } from '../../features/branches/components/BranchToasts';
import { useBranches } from '../../features/branches/hooks/useBranches';
import { BranchHeader } from './BranchSettingsHeader';
import { BranchList } from './BranchList';

export default function BranchSettingsSection() {
  const branches = useBranches();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <BranchHeader onAdd={() => branches.setModal('add')} />

      <div className="px-6 py-5 max-w-6xl mx-auto">
        <BranchStats stats={branches.stats} />

        <BranchFilters
          search={branches.search}
          onSearch={branches.setSearch}
          regions={branches.regions}
          filterRegion={branches.filterRegion}
          onFilterRegion={branches.setFilterRegion}
        />

        <BranchList
          loading={branches.loading}
          regions={branches.visibleRegions}
          filtered={branches.filtered}
          branches={branches.branches}
          onEdit={branches.setModal}
          onDelete={branches.setDeleteTarget}
        />
      </div>

      {branches.modal ? (
        <BranchModal
          branch={branches.modal === 'add' ? null : branches.modal}
          regions={branches.regions}
          onClose={() => branches.setModal(null)}
          onSave={branches.handleSave}
        />
      ) : null}

      {branches.deleteTarget ? (
        <BranchDeleteConfirm
          branch={branches.deleteTarget}
          onConfirm={() => branches.handleDelete(branches.deleteTarget.id)}
          onCancel={() => branches.setDeleteTarget(null)}
        />
      ) : null}

      <BranchToasts toasts={branches.toasts} />
    </section>
  );
}
