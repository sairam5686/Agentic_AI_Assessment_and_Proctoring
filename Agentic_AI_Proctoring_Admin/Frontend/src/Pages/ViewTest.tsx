import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '../Components/NavBar';
import { useNavigate } from 'react-router';
import { Search, Monitor, ChevronRight, Link as LinkIcon, Calendar, Users, ArrowUpDown, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface Assessment {
  test_id: string;
  test_title: string;
  created_at: string;
  candidate_count: number;
  status: string;
}

const ViewTest = () => {
  const navigate = useNavigate();
  const [testArray, setTestArray] = useState<Assessment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('recent');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAssessment, setDeletingAssessment] = useState<Assessment | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deletingAssessment) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delete-test/${deletingAssessment.test_id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(`${deletingAssessment.test_title} assessment is deleted successfully`);
        setTestArray(prev => prev.filter(t => t.test_id !== deletingAssessment.test_id));
        setShowDeleteModal(false);
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to delete assessment");
      }
    } catch (error) {
      console.error("Deletion error:", error);
      toast.error("An error occurred while deleting");
    }
  };

  const fetcher = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/MexicanMonster/tests`);
      const data = await res.json();
      setTestArray(data);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetcher();
  }, []);

  const sortedTests = [...testArray].sort((a, b) => {
    if (sortBy === 'name') {
      return a.test_title.localeCompare(b.test_title);
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const filteredTests = sortedTests.filter(test =>
    test.test_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans">
      <NavBar />

      <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assessments Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor and manage your active test deployments</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'recent')}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02F576]/20 focus:border-[#02F576] transition-all text-sm shadow-sm appearance-none cursor-pointer font-medium text-gray-700 min-w-[140px]"
              >
                <option value="recent">Recent First</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02F576]/20 focus:border-[#02F576] transition-all text-sm shadow-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Enrolled</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-20">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-[#02F576] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">Loading assessments...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTests.length > 0 ? (
                  filteredTests.map((test, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                            <Monitor size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{test.test_title}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                              <LinkIcon size={12} />
                              <span className="truncate max-w-[150px]">{import.meta.env.VITE_CANDIDATE_PORTAL_URL}/assessment/{test.test_id}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {test.status === 'active' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-700 border border-green-100 uppercase tracking-widest leading-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse" />
                              Running
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-100 uppercase tracking-widest leading-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" />
                              Terminated
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <Users size={16} className="text-gray-400" />
                          <span className="font-bold text-gray-900">{test.candidate_count}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Candidates</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar size={16} className="text-gray-400" />
                          {new Date(test.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate("/assessment-details", { state: { test } })}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-700 rounded-xl hover:bg-[#02F576] hover:text-white hover:border-[#02F576] transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                          View Monitor
                          <ChevronRight size={14} />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">
                          {test.status === 'terminated' && (
                            <button
                              onClick={() => {
                                setDeletingAssessment(test);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                              title="Delete Assessment"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                          <Search size={32} />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <p className="text-gray-900 font-bold">No results found</p>
                          <p className="text-sm text-gray-500 mt-1">We couldn't find any assessments matching your search criteria.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] px-2">
          <p>Total Deployed: {filteredTests.length}</p>
          <p>Virtusa Assessment Protocol v2.4</p>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Assessment?</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-8 px-4">
                  Are you sure you want to delete <span className="font-bold text-slate-900">"{deletingAssessment?.test_title}"</span>? This will permanently remove all associated data. This action cannot be undone.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-6 py-3.5 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewTest;
