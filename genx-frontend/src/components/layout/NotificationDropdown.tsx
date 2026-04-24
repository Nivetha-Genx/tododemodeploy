import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ExternalLink } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationHubStore } from '@/stores/notificationHubStore';
import { useAuthStore } from '@/stores';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationDropdown() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const {
        notifications,
        unreadCount,
        totalNotifications,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
    } = useNotificationHubStore();

    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('unread');

    useEffect(() => {
        if (user?.id) {
            fetchNotifications();
            fetchUnreadCount();
        }
    }, [user?.id]);

    const handleNotificationClick = async (id: string, readAt: string | null) => {
        if (!readAt) {
            await markAsRead(id);
            setActiveTab('read');
        }
    };

    const unreadNotifications = notifications.filter(n => !n.read_at).slice(0, 5);
    const readNotifications = notifications.filter(n => n.read_at).slice(0, 5);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-11 w-11 text-brand-600 hover:text-brand-700 hover:bg-brand-50/80 rounded-full transition-all duration-300 group hover:shadow-lg hover:shadow-brand-500/10"
                >
                    <Bell
                        className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 !h-6 !w-6"
                        strokeWidth={2}
                    />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-5 min-w-[20px]">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <Badge className="relative h-5 min-w-[20px] px-1 flex items-center justify-center bg-red-600 border-2 border-white text-[10px] font-bold text-white animate-in zoom-in duration-300 shadow-sm rounded-full pointer-events-none">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[500px] p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white animate-in zoom-in-95 duration-200">
                <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Notifications</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full flex h-auto p-0 bg-gray-50/50 border-b border-gray-100 rounded-none shrink-0">
                        <TabsTrigger
                            value="unread"
                            className="flex-1 py-3 sm:py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-brand-600 data-[state=active]:bg-white data-[state=active]:text-brand-600 data-[state=active]:shadow-sm rounded-none text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 transition-all hover:text-brand-500 hover:bg-white/50"
                        >
                            <span className="hidden sm:inline">New & </span>Unread ({unreadCount})
                        </TabsTrigger>
                        <TabsTrigger
                            value="read"
                            className="flex-1 py-3 sm:py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-brand-600 data-[state=active]:bg-white data-[state=active]:text-brand-600 data-[state=active]:shadow-sm rounded-none text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 transition-all hover:text-brand-500 hover:bg-white/50"
                        >
                            <span className="hidden sm:inline">Archive & </span>Read ({Math.max(0, totalNotifications - unreadCount)})
                        </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[60vh] sm:h-[500px] w-full">
                        <TabsContent value="unread" className="m-0 focus-visible:ring-0 w-full overflow-hidden">
                            {unreadNotifications.length > 0 ? (
                                <div className="divide-y divide-gray-50 flex flex-col w-full">
                                    {unreadNotifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification.id, notification.read_at)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No unread notifications" />
                            )}
                        </TabsContent>

                        <TabsContent value="read" className="m-0 focus-visible:ring-0 w-full overflow-hidden">
                            {readNotifications.length > 0 ? (
                                <div className="divide-y divide-gray-50 flex flex-col w-full">
                                    {readNotifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification.id, notification.read_at)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No archived notifications" />
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <div className="p-4 sm:p-5 bg-gray-50/30 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={unreadCount === 0}
                        onClick={() => markAllAsRead()}
                        className="w-full sm:w-auto text-gray-600 font-semibold hover:bg-brand-50 border border-brand-200 hover:text-brand-600 disabled:opacity-30 border-gray-200 px-5 h-10 transition-all"
                    >
                        Mark all as read
                    </Button>
                    <Button
                        onClick={() => {
                            setOpen(false);
                            navigate('/notifications');
                        }}
                        className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 h-10 shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center justify-center gap-2 sm:mr-2"
                    >
                        View all <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function NotificationItem({ notification, onClick }: { notification: any, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex flex-col p-4 sm:p-5 cursor-pointer transition-all hover:bg-gray-50 group relative overflow-hidden",
                !notification.read_at && "bg-brand-50/10"
            )}
        >
            <div className="flex justify-between items-start gap-3 sm:gap-4 w-full min-w-0">
                <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn(
                        "text-[14px] sm:text-[15px] font-bold tracking-tight group-hover:text-brand-600 transition-colors truncate block",
                        !notification.read_at ? "text-gray-900" : "text-gray-500"
                    )}>
                        {notification.title}
                    </span>
                    <p className={cn(
                        "text-[12px] sm:text-[13px] leading-relaxed line-clamp-2 mt-1",
                        !notification.read_at ? "text-gray-600 font-medium" : "text-gray-400"
                    )}>
                        {notification.message}
                    </p>
                </div>
                <div className="shrink-0 pt-0.5">
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 whitespace-nowrap bg-gray-100/80 px-2 sm:px-2.5 py-1.5 rounded-md border border-gray-200 block shadow-sm">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-[450px] p-8 text-center bg-white">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 transition-all hover:rotate-12 duration-500 shadow-inner">
                <Bell className="h-10 w-10 text-gray-200" strokeWidth={1.5} />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">{message}</h4>
            <p className="text-sm text-gray-400 max-w-[250px] mx-auto">We'll alert you here when new activities happen in your projects.</p>
        </div>
    );
}
