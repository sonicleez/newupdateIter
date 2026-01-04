import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Activity, Key, Database, TrendingUp, Image,
    MessageSquare, RefreshCw, ArrowLeft, Clock, Zap,
    Shield, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';
import {
    getAdminUsers, getAdminStats, getRecentActivity, getDOPModelStats,
    subscribeToActivity, AdminUser, AdminStats
} from '../../utils/adminAPI';

interface AdminDashboardProps {
    onClose: () => void;
    isAdmin: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, isAdmin }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'dop'>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [dopStats, setDopStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsData, usersData, activityData, dopData] = await Promise.all([
                getAdminStats(),
                getAdminUsers(),
                getRecentActivity(50),
                getDOPModelStats()
            ]);
            setStats(statsData);
            setUsers(usersData);
            setActivity(activityData);
            setDopStats(dopData);
        } catch (e) {
            console.error('Failed to load admin data:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();

        // Subscribe to realtime updates
        const subscription = subscribeToActivity((payload) => {
            setRealtimeEvents(prev => [payload.new, ...prev].slice(0, 10));
            // Refresh activity list
            getRecentActivity(50).then(setActivity);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loadData]);

    if (!isAdmin) {
        return (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
                <div className="bg-red-900/50 border border-red-500 rounded-xl p-8 text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400">You don't have admin privileges.</p>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-700 rounded hover:bg-gray-600">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-950 z-50 overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Shield className="w-6 h-6 text-purple-500" />
                            Admin Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">Manage users, usage, and API keys</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Realtime indicator */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/50 rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs text-green-400">Live</span>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 hover:bg-gray-800 rounded"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800 px-6">
                <div className="flex gap-1">
                    {[
                        { id: 'overview', label: 'Overview', icon: TrendingUp },
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'activity', label: 'Activity', icon: Activity },
                        { id: 'dop', label: 'DOP Learning', icon: Database }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-purple-500 text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && stats && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="blue" />
                            <StatCard icon={Zap} label="Active (24h)" value={stats.activeUsers24h} color="green" />
                            <StatCard icon={Image} label="Total Images" value={stats.totalImages} color="purple" />
                            <StatCard icon={MessageSquare} label="Text Tokens" value={`${(stats.totalTextTokens / 1000).toFixed(1)}K`} color="yellow" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <StatCard icon={Image} label="Scenes Generated" value={stats.totalScenes} color="cyan" />
                            <StatCard icon={Users} label="Characters Generated" value={stats.totalCharacters} color="pink" />
                        </div>

                        {/* Provider breakdown */}
                        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                            <h3 className="text-lg font-semibold text-white mb-4">Provider Breakdown</h3>
                            <div className="flex gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-gray-400">Gemini:</span>
                                    <span className="text-white font-bold">{stats.geminiImages.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                    <span className="text-gray-400">Gommo:</span>
                                    <span className="text-white font-bold">{stats.gommoImages.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-4 h-4 bg-gray-800 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-blue-500 h-full"
                                    style={{ width: `${(stats.geminiImages / (stats.geminiImages + stats.gommoImages) * 100) || 50}%` }}
                                />
                                <div className="bg-yellow-500 h-full flex-1" />
                            </div>
                        </div>

                        {/* Realtime Events */}
                        {realtimeEvents.length > 0 && (
                            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-green-500" />
                                    Live Events
                                </h3>
                                <div className="space-y-2">
                                    {realtimeEvents.map((event, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm px-3 py-2 bg-gray-800/50 rounded">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                            <span className="text-gray-400">{event.generation_type}</span>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-gray-500">{event.model_id}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Total Images</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Scenes</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Characters</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Provider</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Last Activity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                                    {user.email?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <span className="text-white">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-white font-mono">{user.total_images}</td>
                                        <td className="px-4 py-3 text-cyan-400 font-mono">{user.scenes_generated}</td>
                                        <td className="px-4 py-3 text-pink-400 font-mono">{user.characters_generated}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded">
                                                    G: {user.gemini_images}
                                                </span>
                                                <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 text-xs rounded">
                                                    Go: {user.gommo_images}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-sm">
                                            {user.last_activity ? new Date(user.last_activity).toLocaleString('vi-VN') : 'Never'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Time</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Model</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Resolution</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Aspect Ratio</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Project</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {activity.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-400 text-sm">
                                            {new Date(item.created_at).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${item.generation_type === 'scene' ? 'bg-cyan-900/50 text-cyan-400' :
                                                    item.generation_type === 'character' ? 'bg-pink-900/50 text-pink-400' :
                                                        'bg-gray-700 text-gray-400'
                                                }`}>
                                                {item.generation_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white text-sm font-mono">
                                            {item.model_id?.slice(0, 20)}...
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{item.resolution}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{item.aspect_ratio}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-32">
                                            {item.project_id}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* DOP Learning Tab */}
                {activeTab === 'dop' && (
                    <div className="space-y-6">
                        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                            <div className="p-4 border-b border-gray-800">
                                <h3 className="text-lg font-semibold text-white">Model Performance (DOP Learning)</h3>
                            </div>
                            <table className="w-full">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Model Type</th>
                                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Total Generations</th>
                                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Approved</th>
                                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Approval Rate</th>
                                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Avg Quality</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {dopStats.map((model, i) => (
                                        <tr key={i} className="hover:bg-gray-800/50">
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-sm font-mono ${model.model_type === 'gemini' ? 'bg-blue-900/50 text-blue-400' :
                                                        model.model_type === 'imagen' ? 'bg-green-900/50 text-green-400' :
                                                            'bg-yellow-900/50 text-yellow-400'
                                                    }`}>
                                                    {model.model_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-white font-mono">
                                                {model.total_generations?.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-green-400 font-mono">
                                                {model.approved_count?.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500"
                                                            style={{ width: `${(model.approval_rate || 0) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-gray-400 text-sm">
                                                        {((model.approval_rate || 0) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-yellow-400 font-mono">
                                                {(model.avg_quality || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard: React.FC<{
    icon: any;
    label: string;
    value: number | string;
    color: 'blue' | 'green' | 'purple' | 'yellow' | 'cyan' | 'pink';
}> = ({ icon: Icon, label, value, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        yellow: 'from-yellow-500 to-yellow-600',
        cyan: 'from-cyan-500 to-cyan-600',
        pink: 'from-pink-500 to-pink-600',
    };

    return (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-gray-500 text-sm">{label}</p>
                    <p className="text-2xl font-bold text-white">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
