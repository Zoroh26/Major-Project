import React, { useEffect, useState } from "react";
import { useEscalationStore } from "../store/escalations";
import { AlertCircle, X, AlertTriangle } from "lucide-react";

interface CreateEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: Array<{ uuid: string; name: string }>;
  securityPersonnel: Array<{ uuid: string; email: string; name?: string }>;
  preselectedZoneUuid?: string;
  preselectedCameraUuid?: string;
  lockZoneSelection?: boolean;
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

export const CreateEscalationModal: React.FC<CreateEscalationModalProps> = ({
  isOpen,
  onClose,
  zones,
  securityPersonnel,
  preselectedZoneUuid,
  preselectedCameraUuid,
  lockZoneSelection = false,
}) => {
  const createEscalation = useEscalationStore((state) => state.createEscalation);
  const assignEscalation = useEscalationStore((state) => state.assignEscalation);
  const isLoading = useEscalationStore((state) => state.isLoading);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    zone_uuid: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    assigned_to: string;
  }>({
    zone_uuid: "",
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;

    setFormData((prev) => ({
      ...prev,
      zone_uuid: preselectedZoneUuid || prev.zone_uuid,
    }));
  }, [isOpen, preselectedZoneUuid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    try {
      // Create escalation
      const escalation = await createEscalation({
        zone_uuid: formData.zone_uuid,
        camera_uuid: preselectedCameraUuid,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
      });

      // Assign if security personnel selected
      if (formData.assigned_to) {
        await assignEscalation(escalation.uuid, formData.assigned_to);
      }

      // Reset form
      setFormData({
        zone_uuid: "",
        title: "",
        description: "",
        priority: "medium",
        assigned_to: "",
      });

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create escalation";
      setSubmitError(message);
      console.error("Failed to create escalation:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Create Escalation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mb-4 flex items-center gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Zone Selection */}
          <div>
            <label htmlFor="zone_uuid" className="block text-sm font-medium text-gray-700">
              Zone <span className="text-red-500">*</span>
            </label>
            <select
              id="zone_uuid"
              name="zone_uuid"
              value={formData.zone_uuid}
              onChange={handleChange}
              disabled={lockZoneSelection}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Select a zone</option>
              {zones.map((zone) => (
                <option key={zone.uuid} value={zone.uuid}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Unauthorized access attempt"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details about the incident..."
              required
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 flex gap-2">
              {(["low", "medium", "high", "critical"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, priority: p }))}
                  className={`rounded-full px-3 py-1 text-sm font-medium capitalize border ${
                    formData.priority === p
                      ? priorityColors[p]
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Assign To */}
          <div>
            <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">
              Assign To
            </label>
            <select
              id="assigned_to"
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Unassigned (Assign Later)</option>
              {securityPersonnel.map((person) => (
                <option key={person.uuid} value={person.uuid}>
                  {person.name || person.email}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Escalation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
