import { formatDate } from "../education/faculty-dashboard/utils";
import {
  Notification,
} from "@/lib/utils/supabase/admin-notifications";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";
import { BoltIcon, CheckCircleIcon, InfoIcon, TrashBinIcon } from "@/icons";

export interface NotificationCardProps {
  item: Notification;
  actionLabel?: string;
  compact?: boolean;
  onDelete?: () => void;
  onUpdateStatus?: (data: any) => void;
  onClick?: () => void;
}

export default function NotificationCard({
  item,
  actionLabel = "Ouvrir",
  compact = false,
  onDelete,
  onUpdateStatus,
  onClick=()=>{
    console.log('Clicked')
  }
}: NotificationCardProps) {

  const handleUpdateNotificationStatus = async () => {
    try {
      const payload = {
        schema: item?.categorie,
        key: "status",
        value: item?.status !== "pending" ? "pending" : "completed",
      };    
      console.log(payload);
      
      const req = await fetch(`/api/header-notifications?id=${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (req.ok) {
        const resp = await req.json();
        console.log("Response", resp);
        onUpdateStatus?.(payload);
      } else {
        console.error("Failed to update status");
      }
    } catch (error) {
      console.log("Error updating notification status:", error);
    }
  };

  const handleDeleteNotification = async () => {
    try {
      const req = await fetch(`/api/header-notifications?id=${item.id}&schema=${item.categorie}`, {
        method: "DELETE",
      });
      if (req.ok) {
        onDelete?.();
      } else {
        console.error("Failed to delete notification");
      }
    } catch (error) {
      console.log("Error deleting notification:", error);
    }
  };

  const getStatusText = (status: Notification["status"]) => {
    if (status === 'completed') {
      return <Badge variant="solid" endIcon={<BoltIcon />} color="success">Traite</Badge>;
    }

    if (status === 'pending') {
      return <Badge variant="solid" endIcon={<InfoIcon />} color="warning">En cours</Badge>;
    }

    return <Badge variant="solid" endIcon={<TrashBinIcon />} color="info">Annule</Badge>;
  };

  return (
    <article className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-white/5">
      
      <div className="flex gap-4">
        
        {/* 📸 Avatar */}
        <img
          src={item.students?.photo || "/images/inbtp/logo_inbtp.jpg"}
          alt="student"
          className="h-12 w-12 rounded-full object-cover border"
        />

        {/* 📄 Content */}
        <div className="flex-1">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                {item.object || "Notification"}
              </h3>
              <p className="text-xs text-gray-500">
                {item.students?.nom} {item.students?.post_nom}{" "}
                {item.students?.prenom}
              </p>
            </div>

            <span className="text-xs text-gray-400">
              {formatDate(item.created_at)}
            </span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {item.description}
            </p>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
            
            {/* Status */}
            {getStatusText(item.status as string)}

            {/* Actions */}
            <div className="flex items-center gap-3">
              
              {/* Voir */}
              <Button
                variant={"outline"}
                onClick={onClick}
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                {!compact ? "Voir" : actionLabel}
              </Button>
              {
                !compact ? (
                <>
                    <Button
                        variant={"outline"}
                        endIcon={<CheckCircleIcon />}
                        onClick={handleUpdateNotificationStatus}
                        className="text-sm text-green-600 hover:underline"
                    >
                        Valider
                    </Button>

                    <Button
                        variant={"outline"}
                        endIcon={<TrashBinIcon />}
                        onClick={handleDeleteNotification}
                        className="text-sm text-red-600 hover:underline"
                    >
                        Supprimer
                    </Button>
                </>
                ) : null
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
