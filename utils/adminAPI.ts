/**
 * Admin API - Functions for admin dashboard
 * Requires service_role or admin access
 */

import { supabase } from './supabaseClient';

export interface AdminUser {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;

    // Profile data
    display_name?: string;

    // Global stats
    total_images: number;
    scenes_generated: number;
    characters_generated: number;
    gemini_images: number;
    gommo_images: number;
    text_tokens: number;

    // API Keys
    has_gemini_key: boolean;
    has_gommo_credentials: boolean;

    // Activity
    last_activity?: string;
    history_count: number;
}

export interface AdminStats {
    totalUsers: number;
    activeUsers24h: number;
    totalImages: number;
    totalScenes: number;
    totalCharacters: number;
    geminiImages: number;
    gommoImages: number;
    totalTextTokens: number;
}

export interface APIKeyInfo {
    user_id: string;
    email: string;
    key_type: 'gemini' | 'gommo';
    key_preview: string;
    created_at: string;
    last_used?: string;
}

/**
 * Get all users with their stats
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
    try {
        // Get users from auth.users via view
        const { data: users, error } = await supabase
            .from('user_usage_summary')
            .select('*')
            .order('last_activity', { ascending: false, nullsFirst: false });

        if (error) throw error;

        return (users || []).map(u => ({
            id: u.user_id,
            email: u.email || 'unknown',
            created_at: '',
            last_sign_in_at: null,
            total_images: u.total_images || 0,
            scenes_generated: u.scenes || 0,
            characters_generated: u.characters || 0,
            gemini_images: u.gemini_images || 0,
            gommo_images: u.gommo_images || 0,
            text_tokens: u.text_tokens || 0,
            has_gemini_key: false,
            has_gommo_credentials: false,
            last_activity: u.last_activity,
            history_count: u.history_count || 0
        }));
    } catch (e) {
        console.error('[Admin] Failed to fetch users:', e);
        return [];
    }
}

/**
 * Get aggregate admin stats
 */
export async function getAdminStats(): Promise<AdminStats> {
    try {
        // Get DOP prompt records for activity
        const { data: recentActivity } = await supabase
            .from('dop_prompt_records')
            .select('user_id, created_at')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const activeUsers24h = new Set((recentActivity || []).map(r => r.user_id)).size;

        // Aggregate from user_global_stats
        const { data: globalStats } = await supabase
            .from('user_global_stats')
            .select('stats');

        let totalStats = {
            totalUsers: globalStats?.length || 0,
            activeUsers24h,
            totalImages: 0,
            totalScenes: 0,
            totalCharacters: 0,
            geminiImages: 0,
            gommoImages: 0,
            totalTextTokens: 0
        };

        (globalStats || []).forEach((row: any) => {
            const s = row.stats || {};
            totalStats.totalImages += s.totalImages || 0;
            totalStats.totalScenes += s.scenesGenerated || 0;
            totalStats.totalCharacters += s.charactersGenerated || 0;
            totalStats.geminiImages += s.geminiImages || 0;
            totalStats.gommoImages += s.gommoImages || 0;
            totalStats.totalTextTokens += s.textTokens || 0;
        });

        return totalStats;
    } catch (e) {
        console.error('[Admin] Failed to fetch stats:', e);
        return {
            totalUsers: 0,
            activeUsers24h: 0,
            totalImages: 0,
            totalScenes: 0,
            totalCharacters: 0,
            geminiImages: 0,
            gommoImages: 0,
            totalTextTokens: 0
        };
    }
}

/**
 * Get API keys overview (keys stored in user_api_keys table)
 */
export async function getAPIKeysOverview(): Promise<APIKeyInfo[]> {
    try {
        const { data, error } = await supabase
            .from('user_api_keys')
            .select(`
                user_id,
                key_type,
                key_preview,
                created_at,
                last_used,
                profiles!inner(email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((k: any) => ({
            user_id: k.user_id,
            email: k.profiles?.email || 'unknown',
            key_type: k.key_type,
            key_preview: k.key_preview || '***',
            created_at: k.created_at,
            last_used: k.last_used
        }));
    } catch (e) {
        console.error('[Admin] Failed to fetch API keys:', e);
        return [];
    }
}

/**
 * Get recent activity (generations)
 */
export async function getRecentActivity(limit: number = 50): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('generated_images_history')
            .select(`
                id,
                user_id,
                project_id,
                generation_type,
                model_id,
                aspect_ratio,
                resolution,
                created_at
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('[Admin] Failed to fetch activity:', e);
        return [];
    }
}

/**
 * Get DOP learning stats per model
 */
export async function getDOPModelStats(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('dop_model_learnings')
            .select('*')
            .order('total_generations', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('[Admin] Failed to fetch DOP stats:', e);
        return [];
    }
}

/**
 * Subscribe to real-time activity updates
 */
export function subscribeToActivity(callback: (payload: any) => void) {
    return supabase
        .channel('admin-activity')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'generated_images_history'
        }, callback)
        .subscribe();
}

/**
 * Subscribe to real-time DOP updates
 */
export function subscribeToDOPRecords(callback: (payload: any) => void) {
    return supabase
        .channel('admin-dop')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'dop_prompt_records'
        }, callback)
        .subscribe();
}

console.log('[Admin API] Module loaded');
