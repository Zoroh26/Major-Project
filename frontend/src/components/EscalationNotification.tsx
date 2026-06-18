import React, { useEffect, useState } from "react";
import { useEscalationStore } from "../store/escalations";
import { useAuthStore } from "../store/auth";
import { Bell, AlertTriangle, Check, X } from "lucide-react";

interface EscalationNotificationProps {
  onAssignmentReceived?: () => void;
}

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  false_alarm: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

const priorityColors = {
  low: "bg-blue-50 border-l-4 border-blue-500",
  medium: "bg-yellow-50 border-l-4 border-yellow-500",
  high: "bg-orange-50 border-l-4 border-orange-500",
  critical: "bg-red-50 border-l-4 border-red-500",
};

export const EscalationNotification: React.FC<EscalationNotificationProps> = ({
  onAssignmentReceived,
}) => {
  const user = useAuthStore((state) => state.user);
  const shouldPoll = user?.role === "security";

  const {
    assignedToMe,
    unreadCount,
    markAsRead,
    fetchAssignedToMe,
    actOnEscalation,
    resolveEscalation,
    startPolling,
    stopPolling,
  } = useEscalationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!shouldPoll) return;

    // Fetch assigned escalations on mount
    fetchAssignedToMe();
    // Start polling
    startPolling();

    return () => {
      stopPolling();
    };
  }, [shouldPoll, fetchAssignedToMe, startPolling, stopPolling]);

  // Show toast when new assignment arrives
  useEffect(() => {
    if (unreadCount > 0) {
      setShowToast(true);
      onAssignmentReceived?.();

      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [unreadCount, onAssignmentReceived]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    markAsRead();
  };

  const handleActOn = async (uuid: string) => {
    try {
      await actOnEscalation(uuid, "Investigating the incident");
    } catch (error) {
      console.error("Failed to act on escalation:", error);
    }
  };

  const handleResolve = async (uuid: string) => {
    try {
      await resolveEscalation(uuid);
    } catch (error) {
      console.error("Failed to resolve escalation:", error);
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={handleOpen}
          className="relative rounded-full p-2 hover:bg-gray-100"
        >
          <Bell className="h-6 w-6 text-gray-600" />
          {shouldPoll && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute -right-2 top-full z-40 mt-2 max-h-96 w-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="sticky top-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="font-semibold text-gray-900">My Escalations</h3>
              <p className="text-xs text-gray-600">
                {assignedToMe.length} assigned to you
              </p>
            </div>

            {!shouldPoll ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <AlertTriangle className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Notifications are for security users</p>
              </div>
            ) : assignedToMe.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <AlertTriangle className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">No escalations assigned</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {assignedToMe.map((escalation) => (
                  <div
                    key={escalation.uuid}
                    className={`p-3 ${priorityColors[escalation.priority]}`}
                  >
                    {/* Title and Status */}
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="font-medium text-gray-900">
                        {escalation.title}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          statusColors[escalation.status as keyof typeof statusColors]
                        }`}
                      >
                        {escalation.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mb-2 text-sm text-gray-700">
                      {escalation.description}
                    </p>

                    {/* Priority Badge */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
                        {escalation.priority} priority
                      </span>
                    </div>

                    {/* Action Buttons */}
                    {escalation.status !== "resolved" && (
                      <div className="flex gap-2">
                        {!escalation.is_acted_upon && (
                          <button
                            onClick={() => handleActOn(escalation.uuid)}
                            className="flex-1 flex items-center justify-center gap-1 rounded bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200"
                          >
                            <Check className="h-3 w-3" />
                            Act On
                          </button>
                        )}
                        <button
                          onClick={() => handleResolve(escalation.uuid)}
                          className="flex-1 flex items-center justify-center gap-1 rounded bg-green-100 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-200"
                        >
                          <X className="h-3 w-3" />
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 overflow-hidden rounded-lg bg-red-600 text-white shadow-lg">
          <div className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">New Escalation Assigned!</p>
              <p className="text-sm opacity-90">You have been assigned to a new escalation</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
