// src/components/NotificationsBell.tsx
// Updated NotificationsBell with support_reply navigation
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useNavigate } from 'react-router-dom';

export default function NotificationsBell() {
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const userId = 'CURRENT_USER_ID'; // Replace with your auth context value
  const { notifications } = useNotifications(userId);

  const goTo = (n: any) => {
    if (n.type === 'support_reply' && n.metadata?.ticket_id) {
      if (isAdmin) {
        navigate('/admin/messages');
      } else {
        navigate('/support');
      }
      return;
    }
    // other cases...
  };

  return (
    <div>
      <Bell />
      {notifications.length > 0 && <span>{notifications.length}</span>}
      {/* render dropdown with notifications */}
    </div>
  );
}
