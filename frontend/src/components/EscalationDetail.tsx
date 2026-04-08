import React, { useState } from "react";
import { useEscalationStore } from "../store/escalations";
import { X, Check, AlertTriangle } from "lucide-react";

interface EscalationDetailProps {
  escalationUuid: string | null;
  onClose: () => void;
  currentUserRole?: "admin" | "security";
  currentUserUuid?: string;
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

export const EscalationDetail: React.FC<EscalationDetailProps> = ({
  escalationUuid,
  onClose,
  currentUserRole,
  currentUserUuid,
}) => {
  const { escalations, actOnEscalation, resolveEscalation, markFalseAlarm, isLoading } =
    useEscalationStore();

  const [actionText, setActionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const escalation = escalations.find((e) => e.uuid === escalationUuid);

  if (!escalationUuid || !escalation) {
    return null;
  }

  const handleActOn = async () => {
    if (!actionText.trim()) {
      setError("Please enter an action description");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await actOnEscalation(escalationUuid, actionText);
      setSuccess("Action recorded successfully");
      setActionText("");
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to act on escalation";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await resolveEscalation(escalationUuid);
      setSuccess("Escalation resolved successfully");
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resolve escalation";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFalseAlarm = async () => {
    if (!window.confirm("Mark this as a false alarm?")) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await markFalseAlarm(escalationUuid);
      setSuccess("Marked as false alarm");
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark false alarm";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAssignedToMe = escalation.assigned_to === currentUserUuid;
  const canAct = isAssignedToMe && !escalation.is_acted_upon;
  const canResolve = isAssignedToMe || currentUserRole === "admin";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Escalation Details</h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Alert Messages */}
            {error && (
              <div className="mb-4 flex gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 flex gap-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <Check className="h-5 w-5 flex-shrink-0" />
                <p>{success}</p>
              </div>
            )}

            {/* Title and Status */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {escalation.title}
                </h3>
                <span
                  className={`rounded-lg px-3 py-1 text-sm font-bold uppercase ${
                    statusColors[escalation.status as keyof typeof statusColors]
                  }`}
                >
                  {escalation.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <span
                  className={`inline-block rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider ${priorityColors[escalation.priority as keyof typeof priorityColors]}`}
                >
                  {escalation.priority} Priority
                </span>
              </div>
            </div>

            {/* Description and Metadata */}
            <div className={`rounded-lg p-4 ${priorityColors[escalation.priority as keyof typeof priorityColors]}`}>
              <h4 className="mb-2 font-semibold text-gray-900">Description</h4>
              <p className="mb-4 text-gray-700">{escalation.description}</p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Zone</p>
                  <p className="font-semibold text-gray-900">
                    {escalation.zone_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Camera</p>
                  <p className="font-semibold text-gray-900">
                    {escalation.camera_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(escalation.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Assigned To</p>
                  <p className="font-semibold text-gray-900">
                    {escalation.assigned_to_name || "Unassigned"}
                  </p>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="mt-4 space-y-2">
                {escalation.is_acted_upon && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Check className="h-4 w-4" />
                    <span>Action has been taken on this escalation</span>
                  </div>
                )}
                {escalation.resolved_at && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>
                      Resolved on{" "}
                      {new Date(escalation.resolved_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {escalation.status !== "resolved" && (
              <div className="mt-6 space-y-4">
                {/* Act On Section */}
                {canAct && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <label className="mb-2 block font-semibold text-gray-900">
                      Record Action
                    </label>
                    <textarea
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="Describe the action taken on this incident..."
                      className="mb-3 w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      rows={3}
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={handleActOn}
                      disabled={isSubmitting || !actionText.trim()}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
                    >
                      {isSubmitting ? "Recording..." : "Record Action"}
                    </button>
                  </div>
                )}

                {/* Resolve and False Alarm Buttons */}
                <div className="flex gap-2">
                  {canResolve && (
                    <button
                      onClick={handleResolve}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:bg-gray-300"
                    >
                      {isSubmitting ? "Resolving..." : "✓ Resolve"}
                    </button>
                  )}
                  {canResolve && (
                    <button
                      onClick={handleFalseAlarm}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white hover:bg-yellow-700 disabled:bg-gray-300"
                    >
                      {isSubmitting ? "Marking..." : "✗ False Alarm"}
                    </button>
                  )}
                </div>

                {/* Permission Message */}
                {!canAct && !canResolve && (
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                    You don't have permission to act on this escalation.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-gray-200 px-6 py-3">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
