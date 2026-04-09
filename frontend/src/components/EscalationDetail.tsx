import React, { useEffect, useState } from "react";
import { useEscalationStore } from "../store/escalations";
import { escalationService } from "../services/escalation";
import type { Escalation } from "../services/escalation";
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
  const { escalations, fetchEscalations, actOnEscalation, resolveEscalation, markFalseAlarm } =
    useEscalationStore();

  const [actionText, setActionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [liveEscalation, setLiveEscalation] = useState<Escalation | null>(null);
  const [statusOverride, setStatusOverride] = useState<Escalation["status"] | null>(null);

  const escalation = liveEscalation || escalations.find((e) => e.uuid === escalationUuid);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  useEffect(() => {
    if (!escalationUuid) return;

    const fetchLiveEscalation = async () => {
      try {
        const detailed = await escalationService.getEscalation(escalationUuid);
        setLiveEscalation(detailed);
      } catch {
        // Keep store-based fallback if detail fetch fails.
      }
    };

    fetchEscalations();
    fetchLiveEscalation();
    const interval = setInterval(() => {
      fetchEscalations();
      fetchLiveEscalation();
    }, 3000);

    return () => clearInterval(interval);
  }, [escalationUuid, fetchEscalations]);

  useEffect(() => {
    if (!escalationUuid) {
      setLiveEscalation(null);
      setStatusOverride(null);
    }
  }, [escalationUuid]);

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
    if (!isStatusActionable) return;
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await resolveEscalation(escalationUuid);
      setStatusOverride("resolved");
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
    if (!isStatusActionable) return;
    if (!window.confirm("Mark this as a false alarm?")) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await markFalseAlarm(escalationUuid);
      setStatusOverride("false_alarm");
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

  const isAssignedToMe = escalation.assigned_to_uuid === currentUserUuid;
  const canAct = isAssignedToMe && !escalation.is_acted_upon;
  const canResolve = isAssignedToMe || currentUserRole === "admin";
  const effectiveStatus = statusOverride ?? escalation.status;
  const isStatusActionable = effectiveStatus === "pending" || effectiveStatus === "in_progress";
  const canFinalize = canResolve && isStatusActionable;
  const zoneDisplay = escalation.zone_name || escalation.zone_uuid || "Unknown";
  const cameraDisplay = escalation.camera_name || escalation.camera_uuid || "Unknown";
  const assignedToDisplay = escalation.assigned_to_name || escalation.assigned_to_uuid || "Unassigned";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-primary">Escalation Details</h2>
              <p className="text-xs text-primary/60">Incident {escalation.uuid}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-primary/40 hover:bg-surface-container hover:text-primary"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
            {/* Alert Messages */}
            {error && (
              <div className="mb-4 flex gap-3 rounded-lg bg-error/10 p-3 text-sm text-error">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 flex gap-3 rounded-lg bg-green-500/10 p-3 text-sm text-green-700">
                <Check className="h-5 w-5 flex-shrink-0" />
                <p>{success}</p>
              </div>
            )}

            {/* Title and Status */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-primary">
                  {escalation.title}
                </h3>
                <span
                  className={`rounded-lg px-3 py-1 text-sm font-bold uppercase tracking-wide ${
                    statusColors[effectiveStatus as keyof typeof statusColors]
                  }`}
                >
                  {effectiveStatus}
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
            <div className={`rounded-xl p-4 ${priorityColors[escalation.priority as keyof typeof priorityColors]}`}>
              <h4 className="mb-2 font-semibold text-primary">Description</h4>
              <p className="mb-4 text-primary/80">{escalation.description}</p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-primary/60">Zone</p>
                  <p className="font-semibold text-primary">
                    {zoneDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-primary/60">Camera</p>
                  <p className="font-semibold text-primary">
                    {cameraDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-primary/60">Created</p>
                  <p className="font-semibold text-primary">{formatDateTime(escalation.created_at)}</p>
                </div>
                <div>
                  <p className="text-primary/60">Assigned To</p>
                  <p className="font-semibold text-primary">
                    {assignedToDisplay}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3 text-sm">
                <p className="mb-1 font-semibold text-primary">Latest Action</p>
                <p className="text-primary/80">{escalation.action_taken || "No action note yet."}</p>
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
                      Resolved on {formatDateTime(escalation.resolved_at)}
                    </span>
                  </div>
                )}
                <div className="text-xs text-primary/60">Last updated: {formatDateTime(escalation.updated_at || escalation.created_at)}</div>
              </div>
            </div>

            {/* Actions */}
            {(effectiveStatus !== "resolved" && effectiveStatus !== "false_alarm") && (
              <div className="mt-6 space-y-4">
                {/* Act On Section */}
                {canAct && (
                  <div className="rounded-lg border border-blue-300/40 bg-blue-500/10 p-4">
                    <label className="mb-2 block font-semibold text-primary">
                      Record Action
                    </label>
                    <textarea
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="Describe the action taken on this incident..."
                      className="mb-3 w-full resize-none rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-primary focus:border-primary/50 focus:outline-none"
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


                {canResolve && !isStatusActionable && (
                  <div className="rounded-lg bg-surface-container p-3 text-sm text-primary/70">
                    Resolve and False Alarm are only available when status is pending or in progress.
                  </div>
                )}

                {/* Permission Message */}
                {!canAct && !canResolve && (
                  <div className="rounded-lg bg-surface-container p-3 text-sm text-primary/70">
                    You don't have permission to act on this escalation.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-outline-variant/20 px-6 py-3">
            <button
              onClick={onClose}
              className="rounded-lg bg-surface-container px-4 py-2 font-semibold text-primary hover:bg-surface-container-high"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
