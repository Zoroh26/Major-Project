import React, { useEffect, useState } from "react";
import { useEscalationStore } from "../store/escalations";
import { ChevronDown, Filter, AlertTriangle } from "lucide-react";

interface EscalationsListProps {
  currentUserRole?: "admin" | "security";
  onSelectEscalation?: (uuid: string) => void;
}

type FilterStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "false_alarm"
  | "all";
type FilterPriority = "low" | "medium" | "high" | "critical" | "all";

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  false_alarm: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

const priorityBgColors = {
  low: "bg-blue-50",
  medium: "bg-yellow-50",
  high: "bg-orange-50",
  critical: "bg-red-50",
};

const priorityTextColors = {
  low: "text-blue-700",
  medium: "text-yellow-700",
  high: "text-orange-700",
  critical: "text-red-700",
};

export const EscalationsList: React.FC<EscalationsListProps> = ({
  currentUserRole,
  onSelectEscalation,
}) => {
  const { escalations, fetchEscalations, stats, isLoading } =
    useEscalationStore();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [sortBy, setSortBy] = useState<"created" | "priority">("created");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  // Filter and sort escalations
  const filteredEscalations = escalations
    .filter((e) => {
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterPriority !== "all" && e.priority !== filterPriority) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "created") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder]
        );
      }
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "🔔";
      case "assigned":
        return "👤";
      case "in_progress":
        return "⚙️";
      case "resolved":
        return "✓";
      case "false_alarm":
        return "✗";
      default:
        return "•";
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Escalations</h2>
            <p className="text-sm text-gray-600">
              {stats?.total || 0} total • {stats?.pending || 0} pending •{" "}
              {stats?.assigned || 0} assigned
            </p>
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters</span>
          </button>
        </div>

        {/* Filters */}
        {isFilterOpen && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            {/* Status Filter */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FilterStatus)
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="false_alarm">False Alarm</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) =>
                  setFilterPriority(e.target.value as FilterPriority)
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "created" | "priority")}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="created">Newest First</option>
                <option value="priority">Highest Priority</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(filterStatus !== "all" || filterPriority !== "all") && (
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterPriority("all");
                }}
                className="w-full rounded bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center px-6 py-12">
          <p className="text-gray-500">Loading escalations...</p>
        </div>
      ) : filteredEscalations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <AlertTriangle className="mb-2 h-8 w-8 text-gray-400" />
          <p className="text-gray-600">
            {escalations.length === 0
              ? "No escalations yet"
              : "No escalations match your filters"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredEscalations.map((escalation) => (
            <div
              key={escalation.uuid}
              onClick={() => onSelectEscalation?.(escalation.uuid)}
              className={`cursor-pointer border-l-4 px-6 py-4 transition hover:bg-gray-50 ${
                priorityBgColors[escalation.priority as keyof typeof priorityBgColors]
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Title and Status */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">
                      {getStatusIcon(escalation.status)}
                    </span>
                    <h3 className="font-semibold text-gray-900">
                      {escalation.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusColors[
                          escalation.status as keyof typeof statusColors
                        ]
                      }`}
                    >
                      {escalation.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mb-2 text-sm text-gray-600">
                    {escalation.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span className="font-medium">
                      {escalation.zone_name || "Unknown Zone"}
                    </span>
                    {escalation.assigned_to_name && (
                      <span>📋 Assigned to: {escalation.assigned_to_name}</span>
                    )}
                    {escalation.is_acted_upon && (
                      <span className="text-blue-600">✓ Acted Upon</span>
                    )}
                    <span className="text-gray-500">
                      {new Date(escalation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Priority Badge */}
                <div>
                  <span
                    className={`inline-block rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      priorityTextColors[
                        escalation.priority as keyof typeof priorityTextColors
                      ]
                    }`}
                  >
                    {escalation.priority}
                  </span>
                </div>
              </div>

              {/* Expand Indicator */}
              <div className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-700">
                <span>View Details</span>
                <ChevronDown className="ml-1 h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
