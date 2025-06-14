// Supabase Configuration
let supabaseClient = null;

// Initialize Supabase
function initializeSupabase() {
    try {
        // Replace with your actual Supabase URL and API Key
        const SUPABASE_URL = 'https://hsulmmotxtrllkscjmyx.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdWxtbW90eHRybGxrc2NqbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTUzMDksImV4cCI6MjA2NTA3MTMwOX0.SYTIjHpZEpT7nq8PyhcDjQUk4tvveNdiVddmCIExpvE';

        // Validate that we have proper Supabase credentials
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY || 
            SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
            SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
            console.warn('Supabase credentials not configured. Using offline mode.');
            return false;
        }

        console.log('Supabase initialized successfully with real database');

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Authentication
async function authenticateUser(fileNumber, phoneNumber, password) {
    try {
        // Always try to initialize Supabase first
        if (!supabaseClient) {
            initializeSupabase();
        }

        // If Supabase is available, use it
        if (supabaseClient) {
            console.log('Attempting database authentication...');
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('file_number', fileNumber)
                .eq('phone_number', phoneNumber)
                .eq('password', password)
                .single();

            if (error) {
                console.error('Database authentication error:', error);
                // Fall back to demo authentication only if database fails
            } else if (data) {
                console.log('Database authentication successful');
                return data;
            }
        }

        // Database authentication failed
        console.log('Database authentication failed');
        return null;


    } catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
}

// Notifications Management
async function getNotifications() {
    try {
        // Always try to initialize Supabase first
        if (!supabaseClient) {
            initializeSupabase();
        }

        // If Supabase is available, use it
        if (supabaseClient) {
            console.log('Loading notifications from database...');
            const { data, error } = await supabaseClient
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                console.log('Notifications loaded from database successfully');
                return data;
            } else {
                console.error('Error loading notifications from database:', error);
            }
        }

        // Database failed, return empty array
        console.log('Database failed to load notifications');
        return [];


    } catch (error) {
        console.error('Get notifications error:', error);
        return [];
    }
}

async function createNotification(title, content, type) {
    try {
        if (!supabaseClient) {
            initializeSupabase();
        }

        if (supabaseClient) {
            console.log('Creating notification in database...');
            const { data, error } = await supabaseClient
                .from('notifications')
                .insert([
                    {
                        title: title,
                        content: content,
                        type: type,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) {
                console.error('Database error creating notification:', error);
                throw error;
            }

            if (data) {
                console.log('Notification created successfully in database');
                return data;
            }
        }

        // Fallback for demo
        console.log('Using fallback for notification creation...');
        const newNotification = {
            id: Date.now(),
            title,
            content,
            type,
            created_at: new Date().toISOString()
        };
        return [newNotification];
    } catch (error) {
        console.error('Create notification error:', error);
        throw error;
    }
}

async function deleteNotification(notificationId) {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                return true; // Fallback success for demo
            }
        }

        const { error } = await supabaseClient
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Delete notification error:', error);
        throw error;
    }
}

async function updateNotification(id, title, content, type) {
    try {
        if (!supabaseClient) {
            initializeSupabase();
        }

        if (supabaseClient) {
            console.log('Attempting to update notification:', { id, title, content, type });
            const { data, error } = await supabaseClient
                .from('notifications')
                .update({
                    title: title,
                    content: content,
                    type: type,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();

            if (error) {
                console.error('Error updating notification:', error);
                throw error;
            }

            console.log('Notification updated successfully:', data);
            return data[0];
        } else {
            // Fallback for demo
            console.log('Using fallback for notification update...');
            const updatedNotification = {
                id,
                title,
                content,
                type,
                updated_at: new Date().toISOString()
            };
            return updatedNotification;
        }
    } catch (error) {
        console.error('Update notification error:', error);
        throw error;
    }
}

async function markNotificationAsRead(notificationId, userId) {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                return true; // Fallback success for demo
            }
        }

        const { data, error } = await supabaseClient
            .from('notification_reads')
            .upsert([
                {
                    notification_id: notificationId,
                    user_id: userId,
                    read_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Mark notification as read error:', error);
        return null;
    }
}

// Salary Data Management
async function getSalaryData(fileNumber) {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                console.log('Database connection failed');
                return [];
            }
        }

        console.log('Loading salary data for file number:', fileNumber);
        const { data, error } = await supabaseClient
            .from('salaries')
            .select('*')
            .eq('file_number', fileNumber)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error loading salary data:', error);
            throw error;
        }

        console.log('Salary data loaded successfully:', data);
        return data || [];
    } catch (error) {
        console.error('Get salary data error:', error);
        return [];
    }
}

// Expenses Data Management
async function getExpensesData(fileNumber) {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                console.log('Database connection failed');
                return [];
            }
        }

        console.log('Loading expenses data for file number:', fileNumber);
        const { data, error } = await supabaseClient
            .from('expenses')
            .select('*')
            .eq('file_number', fileNumber)
            .order('expense_date', { ascending: false });

        if (error) {
            console.error('Database error loading expenses data:', error);
            throw error;
        }

        console.log('Expenses data loaded successfully:', data);
        return data || [];
    } catch (error) {
        console.error('Get expenses data error:', error);
        return [];
    }
}

// Reports Management
async function createReport(userId, title, content) {
    try {
        if (!supabaseClient) {
            initializeSupabase();
        }

        if (supabaseClient) {
            console.log('Creating report in database...');
            const { data, error } = await supabaseClient
                .from('reports')
                .insert([
                    {
                        user_id: userId,
                        title: title,
                        content: content,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) {
                console.error('Database error creating report:', error);
                throw error;
            }

            if (data && data.length > 0) {
                console.log('Report created successfully in database');
                return data[0];
            }
        }

        // Fallback for demo
        console.log('Using fallback for report creation...');
        return {
            id: Date.now(),
            user_id: userId,
            title,
            content,
            status: 'pending',
            created_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('Create report error:', error);
        throw error;
    }
}

async function getUserReports(userId) {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                console.log('Database connection failed');
                return [];
            }
        }

        const { data, error } = await supabaseClient
            .from('reports')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get user reports error:', error);
        return [];
    }
}

async function getAllReports() {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                console.log('Database connection failed');
                return [];
            }
        }

        const { data, error } = await supabaseClient
            .from('reports')
            .select(`
                *,
                users (
                    name,
                    file_number
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get all reports error:', error);
        return [];
    }
}

async function updateReportStatus(reportId, status) {
    try {
        if (!supabaseClient) {
            initializeSupabase();
        }

        if (supabaseClient) {
            console.log('Updating report status in database...');
            const { data, error } = await supabaseClient
                .from('reports')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', reportId)
                .select();

            if (error) {
                console.error('Database error updating report status:', error);
                throw error;
            }

            console.log('Report status updated successfully in database');
            return true;
        }

        // Fallback success for demo
        console.log('Using fallback for report status update...');
        return true;
    } catch (error) {
        console.error('Update report status error:', error);
        throw error;
    }
}

// User Management Functions
async function updateUserPassword(userId, currentPassword, newPassword) {
    try {
        if (!supabaseClient) {
            initializeSupabase();
        }

        if (supabaseClient) {
            console.log('Updating user password in database...');

            // First verify current password
            const { data: user, error: verifyError } = await supabaseClient
                .from('users')
                .select('password')
                .eq('id', userId)
                .eq('password', currentPassword)
                .single();

            if (verifyError || !user) {
                throw new Error('كلمة المرور الحالية غير صحيحة');
            }

            // Update password
            const { data, error } = await supabaseClient
                .from('users')
                .update({ 
                    password: newPassword,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select();

            if (error) {
                console.error('Database error updating password:', error);
                throw error;
            }

            console.log('Password updated successfully in database');
            return true;
        }

        // Fallback success for demo
        console.log('Using fallback for password update...');
        return true;
    } catch (error) {
        console.error('Update password error:', error);
        throw error;
    }
}

async function updateUserPhone(userId, newPhoneNumber) {
    try {
        if (!supabaseClient) {
            initializeSupabase();
        }

        if (supabaseClient) {
            console.log('Updating user phone number in database...');

            const { data, error } = await supabaseClient
                .from('users')
                .update({ 
                    phone_number: newPhoneNumber,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select();

            if (error) {
                console.error('Database error updating phone:', error);
                throw error;
            }

            console.log('Phone number updated successfully in database');
            return data[0];
        }

        // Fallback success for demo
        console.log('Using fallback for phone update...');
        return { phone_number: newPhoneNumber };
    } catch (error) {
        console.error('Update phone error:', error);
        throw error;
    }
}

// Performance Reports Management
async function getPerformanceReports(fileNumber) {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                console.log('Database connection failed');
                return [];
            }
        }

        console.log('Loading performance reports for file number:', fileNumber);
        const { data, error } = await supabaseClient
            .from('performance_reports')
            .select('*')
            .eq('file_number', fileNumber)
            .order('year', { ascending: false })
            .order('month', { ascending: false });

        if (error) {
            console.error('Database error loading performance reports:', error);
            throw error;
        }

        console.log('Performance reports loaded successfully:', data);
        return data || [];
    } catch (error) {
        console.error('Get performance reports error:', error);
        return [];
    }
}

// Make sure all functions are available globally
window.supabaseDb = {
    authenticateUser,
    getNotifications,
    createNotification,
    deleteNotification,
    markNotificationAsRead,
    getSalaryData,
    getExpensesData,
    createReport,
    getUserReports,
    getAllReports,
    updateReportStatus,
    updateUserPassword,
    updateUserPhone,
    updateNotification,
    getPerformanceReports
};

// Initialize Supabase when the script loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSupabase();
});