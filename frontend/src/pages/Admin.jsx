import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { DatabaseZap, Loader2, Link, ServerCrash, RefreshCw, Plus, X } from 'lucide-react';

export const Admin = () => {
  const [patches, setPatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatchContent, setNewPatchContent] = useState('');
  const [newPatchChunkId, setNewPatchChunkId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatches = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/patches');
      setPatches(res.data);
    } catch (err) {
      console.error('Failed to fetch patches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatches();
  }, []);

  const togglePatch = async (id, isActive) => {
    try {
      if (isActive) {
        await api.patch(`/patches/${id}/deactivate`);
      } else {
        await api.patch(`/patches/${id}/activate`);
      }
      fetchPatches(); // Refresh list to get updated state
    } catch (err) {
      console.error('Failed to toggle patch:', err);
      alert('Action failed.');
    }
  };

  const handleCreatePatch = async (e) => {
    e.preventDefault();
    if (!newPatchContent.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        content: newPatchContent.trim(),
        original_chunk_id: newPatchChunkId ? parseInt(newPatchChunkId, 10) : null
      };
      
      await api.post('/patches', payload);
      
      // Reset and close modal
      setNewPatchContent('');
      setNewPatchChunkId('');
      setIsModalOpen(false);
      
      // Refresh patches
      fetchPatches();
    } catch (err) {
      console.error('Failed to create patch:', err);
      alert(err.response?.data?.detail || 'Failed to create correction patch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full gap-6 relative">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-rose-400 bg-clip-text text-transparent">
            System Admin
          </h2>
          <p className="text-sm text-textMuted mt-1">Manage RAG self-healing patches and global overrides.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5 -ml-1" />
            New Correction
          </button>
          <button 
            onClick={fetchPatches}
            className="p-2 border border-border rounded-lg bg-surface hover:bg-surfaceHover text-text transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-primary">
          <DatabaseZap className="w-8 h-8 text-primary mb-3" />
          <h3 className="text-2xl font-bold text-text mb-1">{patches.length}</h3>
          <p className="text-sm text-textMuted">Total Patches</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-green-500">
           <DatabaseZap className="w-8 h-8 text-green-500 mb-3" />
          <h3 className="text-2xl font-bold text-text mb-1">{patches.filter(p => p.is_active).length}</h3>
          <p className="text-sm text-textMuted">Active Corrections</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-rose-500">
           <ServerCrash className="w-8 h-8 text-rose-500 mb-3" />
          <h3 className="text-2xl font-bold text-text mb-1">{patches.filter(p => !p.is_active).length}</h3>
          <p className="text-sm text-textMuted">Deactivated Patches</p>
        </div>
      </div>

      {/* Patches Data Table */}
      <div className="flex-1 glass-panel rounded-2xl border border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/30">
          <h3 className="font-semibold text-text">Knowledge Correction History</h3>
        </div>

        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : patches.length === 0 ? (
            <div className="text-center py-12 text-textMuted">
              No patches recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface border-b border-border text-textMuted text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">ID</th>
                  <th className="px-6 py-4">Correction Content</th>
                  <th className="px-6 py-4">Linked Chunk</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {patches.map((patch) => (
                  <tr key={patch.id} className="hover:bg-surfaceHover/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-textMuted">#{patch.id}</td>
                    <td className="px-6 py-4 min-w-[300px] whitespace-normal">
                      <div className="line-clamp-2 text-text">
                        {patch.content}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {patch.original_chunk_id ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md font-medium text-xs w-fit">
                          <Link className="w-3 h-3" />
                          Chunk #{patch.original_chunk_id}
                        </span>
                      ) : (
                        <span className="text-xs text-textMuted italic">Global Rule</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-textMuted">
                      {new Date(patch.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        patch.is_active 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {patch.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePatch(patch.id, patch.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          patch.is_active
                            ? 'bg-surface hover:bg-rose-500/10 text-rose-400 border-border hover:border-rose-500/30'
                            : 'bg-surface hover:bg-green-500/10 text-green-400 border-border hover:border-green-500/30'
                        }`}
                      >
                        {patch.is_active ? 'Rollback' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Patch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border bg-surface/[0.2]">
              <h3 className="text-lg font-bold text-text">Create Knowledge Correction</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-textMuted hover:text-text hover:bg-surfaceHover rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePatch} className="p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text">Correction Content <span className="text-rose-400">*</span></label>
                <textarea
                  required
                  value={newPatchContent}
                  onChange={(e) => setNewPatchContent(e.target.value)}
                  placeholder="Enter the correct information. The AI will prioritize this over retrieved documents."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[120px] resize-y"
                />
                <p className="text-xs text-textMuted">Be concise and specific. This text will be embedded and retrieved during RAG queries.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text">Target Chunk ID <span className="text-textMuted font-normal">(Optional)</span></label>
                <input
                  type="number"
                  value={newPatchChunkId}
                  onChange={(e) => setNewPatchChunkId(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-textMuted">If overriding a specific document chunk, enter its ID. Leave blank to make this a global rule.</p>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-textMuted hover:bg-surfaceHover border border-transparent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPatchContent.trim()}
                  className="px-5 py-2.5 bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
