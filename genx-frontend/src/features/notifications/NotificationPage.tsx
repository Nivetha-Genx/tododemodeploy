import { useEffect } from 'react';
import { useNotificationHubStore } from '@/stores/notificationHubStore';
import { useAuthStore, useUIStore, isAdmin, getAccessLevel } from '@/stores';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Bell,
    Check,
    CheckCircle2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
// import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

import { useState } from 'react';
import { Eye } from 'lucide-react';

export function NotificationPage() {
    const navigate = useNavigate();
    const { openTaskDrawer } = useUIStore();
    const {
        notifications,
        unreadCount,
        totalNotifications,
        pagination,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        fetchUnreadCount,
        clearAll,
        loading,
    } = useNotificationHubStore();
    const { user } = useAuthStore();
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('unread');
    const [isInitialMount, setIsInitialMount] = useState(true);

    useEffect(() => {
        if (!user?.id) return;

        const loadData = async () => {
            if (isInitialMount) {
                fetchUnreadCount();
                // Fetch both counts and the first list concurrently
                await Promise.all([
                    fetchNotifications(1, 1, 'all'),
                    fetchNotifications(currentPage, 20, activeTab === 'unread' ? 'unread' : 'read')
                ]);
                setIsInitialMount(false);
            } else {
                await fetchNotifications(currentPage, 20, activeTab === 'unread' ? 'unread' : 'read');
            }
        };

        loadData();
    }, [user?.id, currentPage, activeTab, fetchNotifications, fetchUnreadCount, isInitialMount]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setCurrentPage(1);
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.read_at) {
            await markAsRead(notification.id);
            if (activeTab === 'unread') {
                setActiveTab('read');
                setCurrentPage(1);
            }
        }
        handleViewAction(notification);
    };

    const handleViewAction = (notification: any) => {
        const notificationType = notification.data?.type;
        const taskId = notification.data?.task_id;

        // For comment notifications, always open the task drawer (for all roles)
        if (notificationType === 'task_commented' && taskId) {
            openTaskDrawer(taskId);
            return;
        }

        // For other notification types: admins go to approvals, members see the task drawer
        const accessLevel = getAccessLevel(user);
        if (isAdmin(accessLevel)) {
            navigate('/approvals');
        } else {
            if (taskId) {
                openTaskDrawer(taskId);
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col h-[calc(100vh-8rem)]">
            <div className="shrink-0 space-y-1">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Bell className="w-6 h-6 text-brand-600 shrink-0" />
                            <span className="truncate">Notifications</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => markAllAsRead()}
                            disabled={unreadCount === 0}
                            className="gap-1.5 sm:gap-2 bg-gray-100/80 hover:bg-brand-100 hover:text-brand-600 hover:border-brand-300 text-gray-600 font-bold border border-brand-200 transition-all rounded-full px-2.5 sm:px-4 h-8 shadow-sm text-[10px] uppercase tracking-wider"
                        >
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline sm:inline">Read All</span>
                            <span className="xs:hidden">Read</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => clearAll()}
                            disabled={notifications.length === 0}
                            className="gap-1.5 sm:gap-2 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-gray-500 font-bold transition-all rounded-full px-2.5 sm:px-4 h-8 shadow-sm text-[10px] uppercase tracking-wider"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline sm:inline">Clear All</span>
                            <span className="xs:hidden">Clear</span>
                        </Button>
                    </div>
                </div>
                <p className="text-gray-500 text-sm sm:text-base pl-8 sr-only sm:not-sr-only animate-in fade-in slide-in-from-top-1 duration-500">
                    Stay updated with your latest activities
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
                <div className="sticky top-0 z-10 py-3 sm:py-4 bg-gray-50/80 backdrop-blur-md -mx-4 px-4 overflow-x-auto border-b border-gray-100 mb-6 shrink-0">
                    <TabsList className="bg-white/50 p-1 sm:p-1.5 rounded-full border border-gray-200/50 flex h-auto w-max mx-auto gap-0.5 sm:gap-1 shadow-sm">
                        <TabsTrigger
                            value="unread"
                            className="px-4 sm:px-8 py-2.5 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            New & Unread ({unreadCount})
                        </TabsTrigger>
                        <TabsTrigger
                            value="read"
                            className="px-4 sm:px-8 py-2.5 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2 whitespace-nowrap"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Archive & Read ({Math.max(0, totalNotifications - unreadCount)})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 flex flex-col min-h-0 relative">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="min-w-0 pb-24">
                            {loading ? (
                                <div className="flex flex-col border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0 animate-pulse">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                <div className="w-1/4 h-4 bg-gray-100 rounded" />
                                                <div className="flex-1 h-3 bg-gray-50 rounded" />
                                            </div>
                                            <div className="w-20 h-4 bg-gray-50 rounded shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* fluid layout for all screens */}
                                    <div className="min-w-0">
                                        <TabsContent value="unread" className="m-0 focus-visible:ring-0">
                                            {notifications.filter(n => !n.read_at).length > 0 ? (
                                                <div className="flex flex-col border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                                                    {notifications.filter(n => !n.read_at).map((notification) => (
                                                        <NotificationListItem
                                                            key={notification.id}
                                                            notification={notification}
                                                            onRead={markAsRead}
                                                            onClick={() => handleNotificationClick(notification)}
                                                            onView={() => handleViewAction(notification)}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState message="No unread notifications" subMessage="You've caught up with everything!" />
                                            )}
                                        </TabsContent>

                                        <TabsContent value="read" className="m-0 focus-visible:ring-0">
                                            {notifications.filter(n => !!n.read_at).length > 0 ? (
                                                <div className="flex flex-col border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                                                    {notifications.filter(n => !!n.read_at).map((notification) => (
                                                        <NotificationListItem
                                                            key={notification.id}
                                                            notification={notification}
                                                            onClick={() => handleNotificationClick(notification)}
                                                            onView={() => handleViewAction(notification)}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState message="No archived notifications" subMessage="We'll alert you here when new activities happen in your projects." />
                                            )}
                                        </TabsContent>
                                    </div>

                                    {/* Unified Scrolling Pagination - Matching TodayPage style */}
                                    {pagination.last_page > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 mt-6 border-t border-gray-100">
                                            <p className="text-sm text-gray-500 order-3 sm:order-1 text-center sm:text-left">
                                                Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{pagination.last_page}</span> ({pagination.total} total)
                                            </p>
                                            <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                                                <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                        disabled={currentPage === 1}
                                                        className="h-9 px-3"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                                        <span className="hidden sm:inline">Previous</span>
                                                    </Button>

                                                    <div className="flex items-center gap-1 mx-1">
                                                        {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                                            let pageNum: number;
                                                            if (pagination.last_page <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (currentPage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (currentPage >= pagination.last_page - 2) {
                                                                pageNum = pagination.last_page - 4 + i;
                                                            } else {
                                                                pageNum = currentPage - 2 + i;
                                                            }
                                                            return (
                                                                <Button
                                                                    key={pageNum}
                                                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    onClick={() => setCurrentPage(pageNum)}
                                                                    className="w-8 h-8 p-0 shrink-0"
                                                                >
                                                                    {pageNum}
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                                                        disabled={currentPage === pagination.last_page}
                                                        className="h-9 px-3"
                                                    >
                                                        <span className="hidden sm:inline">Next</span>
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}

function NotificationListItem({ notification, onRead, onClick, onView }: { notification: any, onRead?: (id: string) => void, onClick?: () => void, onView?: () => void }) {
    const isUnread = !notification.read_at;
    const [isProcessing, setIsProcessing] = useState(false);

    const handleClick = async () => {
        if (!onClick) return;
        setIsProcessing(true);
        try {
            await onClick();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onView) return;
        setIsProcessing(true);
        try {
            await onView();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                "group relative flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 px-3 sm:px-6 py-4 border-b border-gray-100 last:border-0 cursor-pointer transition-all duration-200",
                isUnread ? "bg-white" : "bg-gray-50/30",
                "hover:bg-brand-50/40 hover:z-10"
            )}
        >
            {/* Unread Indicator Bar */}
            {isUnread && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600 rounded-r-full" />
            )}

            {/* Row container for Icon and Content on mobile */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:flex-1 min-w-0">
                {/* Leading: Icon/Avatar */}
                <div className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300 shadow-sm mt-0.5",
                    isUnread ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-400"
                )}>
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-brand-600" />
                    ) : (
                        <Bell className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isUnread ? "animate-pulse" : "")} strokeWidth={isUnread ? 3 : 2} />
                    )}
                </div>

                {/* Center: Content */}
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-4">
                    <div className={cn(
                        "w-full sm:w-1/3 lg:w-1/4 truncate transition-colors text-sm sm:text-base",
                        isUnread ? "text-gray-900 font-bold" : "text-gray-500 font-medium"
                    )}>
                        {notification.title}
                    </div>

                    <div className={cn(
                        "flex-1 md:truncate text-[13px] sm:text-sm transition-colors line-clamp-2 md:line-clamp-none",
                        isUnread ? "text-gray-700 font-medium" : "text-gray-400 font-normal"
                    )}>
                        {notification.message}
                    </div>
                </div>
            </div>

            {/* Trailing: Metadata & Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100/50 pl-12 sm:pl-0">
                {/* Date/Time */}
                <div className={cn(
                    "flex flex-col items-end gap-0.5 text-[11px] font-bold uppercase tracking-wider min-w-[70px] sm:min-w-[80px]",
                    isUnread ? "text-gray-600" : "text-gray-400"
                )}>
                    <span className="flex items-center gap-1">
                        {format(new Date(notification.created_at), 'MMM dd')}
                    </span>
                    <span className={cn(
                        "text-[10px] font-medium normal-case",
                        isUnread ? "text-gray-500 opacity-100" : "opacity-70"
                    )}>
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 transition-all duration-200">
                    {isUnread && onRead && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRead(notification.id);
                            }}
                            className="h-8 w-8 rounded-full text-brand-700 hover:text-brand-800 hover:bg-brand-200 shadow-sm bg-brand-100"
                            title="Mark as read"
                        >
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                        </Button>
                    )}
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleViewClick}
                        disabled={isProcessing}
                        className="bg-white hover:bg-brand-600 hover:text-white text-gray-600 font-bold h-8 px-4 rounded-full shadow-sm border border-gray-100 transition-all active:scale-95 flex items-center gap-1.5 text-xs whitespace-nowrap"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        {/* View */}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message, subMessage }: { message: string, subMessage?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-300 ring-8 ring-gray-50/50 shadow-inner group-hover:rotate-12 transition-all duration-500">
                <Bell className="w-10 h-10 text-gray-200" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{message}</h3>
            {subMessage && (
                <p className="text-sm text-gray-400 max-w-[250px] mx-auto font-medium">
                    {subMessage}
                </p>
            )}
        </div>
    );
}
