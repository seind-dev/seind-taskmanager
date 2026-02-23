import React, { useEffect, useState } from 'react';
import type { Group, GroupMember } from '../../shared/types';

export default function GroupsPage(): React.ReactElement {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const loadGroups = async () => {
    const data = await window.api.getGroups();
    setGroups(data);
  };

  const loadMembers = async (groupId: string) => {
    const data = await window.api.getGroupMembers(groupId);
    setMembers(data);
  };

  useEffect(() => {
    loadGroups();
    window.api.getSession().then((s) => { if (s) setCurrentUserId(s.userId); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedGroup) loadMembers(selectedGroup.id);
    else setMembers([]);
  }, [selectedGroup]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const group = await window.api.createGroup(newGroupName.trim());
      setGroups((prev) => [group, ...prev]);
      setNewGroupName('');
      setSelectedGroup(group);
    } catch (err) {
      setError('Grup oluşturulamadı: ' + (err instanceof Error ? err.message : String(err)));
    }
    setCreating(false);
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !newMemberName.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');
    const result = await window.api.addGroupMember(selectedGroup.id, newMemberName.trim());
    if (result.success) {
      setSuccess('Üye eklendi');
      setNewMemberName('');
      loadMembers(selectedGroup.id);
    } else {
      setError(result.error || 'Üye eklenemedi');
    }
    setAdding(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;
    await window.api.removeGroupMember(selectedGroup.id, userId);
    loadMembers(selectedGroup.id);
  };

  const handleDeleteGroup = async (groupId: string) => {
    await window.api.deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (selectedGroup?.id === groupId) setSelectedGroup(null);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Gruplar</h1>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left: Group list */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          {/* Create group */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Yeni grup adı..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
              aria-label="Yeni grup adı"
            />
            <button
              onClick={handleCreateGroup}
              disabled={creating || !newGroupName.trim()}
              className="px-3 py-2 rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              +
            </button>
          </div>

          {/* Error for group creation */}
          {error && !selectedGroup && <p className="text-xs text-red-400">{error}</p>}

          {/* Group list */}
          <div className="flex flex-col gap-1.5 overflow-auto">
            {groups.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">Henüz grup yok</p>
            )}
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedGroup?.id === group.id
                    ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{group.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                  className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="Grubu sil"
                  style={{ display: group.ownerId === currentUserId ? undefined : 'none' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Group details */}
        <div className="flex-1 min-w-0">
          {!selectedGroup ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400 dark:text-gray-600">Bir grup seç veya yeni oluştur</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{selectedGroup.name}</h2>

              {/* Add member by Discord username (owner only) */}
              {selectedGroup.ownerId === currentUserId && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Discord kullanıcı adı..."
                  value={newMemberName}
                  onChange={(e) => { setNewMemberName(e.target.value); setError(''); setSuccess(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
                  aria-label="Discord kullanıcı adı"
                />
                <button
                  onClick={handleAddMember}
                  disabled={adding || !newMemberName.trim()}
                  className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {adding ? '...' : 'Ekle'}
                </button>
              </div>
              )}

              {error && selectedGroup && <p className="text-xs text-red-400 mb-3">{error}</p>}
              {success && <p className="text-xs text-emerald-400 mb-3">{success}</p>}

              {/* Members list */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Üyeler ({members.length})</p>
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">{member.discordName || member.userId.slice(0, 8) + '...'}</span>
                      {member.role === 'owner' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">Kurucu</span>
                      )}
                    </div>
                    {member.role !== 'owner' && selectedGroup.ownerId === currentUserId && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        aria-label="Üyeyi çıkar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
