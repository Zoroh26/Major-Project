import React, { useEffect, useState } from "react";
import { useEscalationStore } from "../store/escalations";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface EscalationsWidgetProps {
  onOpenEscalations?: () => void;
  onCreateEscalation?: () => void;
  currentUserRole?: "admin" | "security";
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const statusIcons = {
  pending: "🔔",
  assigned: "👤",
  in_progress: "⚙️",
  resolved: "✓",
  false_alarm: "✗",
  cancelled: "✗",
};

export const EscalationsWidget: React.FC<EscalationsWidgetProps> = ({
  onOpenEscalations,
  onCreateEscalation,
  currentUserRole,
}) => {
  const { escalations, stats, fetchEscalations, assignedToMe, fetchAssignedToMe } =
    useEscalationStore();

  const [displayEscalations, setDisplayEscalations] = useState<typeof escalations>(
    []
  );

  useEffect(() => {
    fetchEscalations();
    fetchAssignedToMe();
  }, [fetchEscalations, fetchAssignedToMe]);

  // Get top 5 recent escalations for widget display
  useEffect(() => {
    const sorted = [...escalations]
      .filter((e) => e.status !== "resolved")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
    setDisplayEscalations(sorted);
  }, [escalations]);

  const criticalCount = escalations.filter((e) => e.priority === "critical").length;
  const highCount = escalations.filter((e) => e.priority === "high").length;
  const activeCount = stats?.pending || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h3 className="font-bold text-gray-900">Recent Escalations</h3>
          <p className="text-sm text-gray-600">
            {activeCount} active • {criticalCount} critical
          </p>
        </div>
        <button
          onClick={onOpenEscalations}
          className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium hover:bg-gray-200"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      {displayEscalations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-8">
          <AlertTriangle className="mb-2 h-8 w-8 text-gray-400" />
          <p className="mb-4 text-sm text-gray-600">No active escalations</p>
          {currentUserRole === "admin" && (
            <button
              onClick={onCreateEscalation}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Create Escalation
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {displayEscalations.map((escalation) => (
            <div key={escalation.uuid} className="px-6 py-3">
              <div className="mb-1 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-lg">
                      {statusIcons[escalation.status as keyof typeof statusIcons]}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {escalation.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {escalation.description}
                  </p>
                </div>
                <span
                  className={`ml-2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                    priorityColors[escalation.priority as keyof typeof priorityColors]
                  }`}
                >
                  {escalation.priority}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span>{escalation.zone_name || "Unknown Zone"}</span>
                {escalation.assigned_to_name && (
                  <span>→ {escalation.assigned_to_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <p className="font-semibold text-gray-900">{stats?.total || 0}</p>
            <p className="text-gray-600">Total</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{stats?.pending || 0}</p>
            <p className="text-gray-600">Pending</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{stats?.assigned || 0}</p>
            <p className="text-gray-600">Assigned</p>
          </div>
        </div>
      </div>
    </div>
  );
};
