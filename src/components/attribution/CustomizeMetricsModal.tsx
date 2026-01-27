import React, { useState } from 'react';
import { X, GripVertical, Eye, EyeOff } from 'lucide-react';
import Modal from '@/components/Modal';
import { MetricDefinition } from './MetricCard';

interface CustomizeMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMetrics: MetricDefinition[];
  visibleMetrics: string[];
  metricOrder: string[];
  onSave: (visibleMetrics: string[], metricOrder: string[]) => void;
}

export const CustomizeMetricsModal: React.FC<CustomizeMetricsModalProps> = ({
  isOpen,
  onClose,
  allMetrics,
  visibleMetrics: initialVisible,
  metricOrder: initialOrder,
  onSave,
}) => {
  const [visibleMetrics, setVisibleMetrics] = useState(initialVisible);
  const [metricOrder, setMetricOrder] = useState(initialOrder);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const orderedMetrics = metricOrder
    .map(id => allMetrics.find(m => m.id === id))
    .filter(Boolean) as MetricDefinition[];

  const unorderedMetrics = allMetrics.filter(
    m => !metricOrder.includes(m.id)
  );

  const sortedMetrics = [...orderedMetrics, ...unorderedMetrics];

  const toggleMetric = (metricId: string) => {
    setVisibleMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleDragStart = (metricId: string) => {
    setDraggedItem(metricId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const newOrder = [...metricOrder];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetId);

    if (draggedIndex === -1) {
      newOrder.push(draggedItem);
    } else {
      newOrder.splice(draggedIndex, 1);
    }

    if (targetIndex === -1) {
      newOrder.push(draggedItem);
    } else {
      newOrder.splice(targetIndex, 0, draggedItem);
    }

    setMetricOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSave = () => {
    onSave(visibleMetrics, metricOrder);
    onClose();
  };

  const handleReset = () => {
    const defaultVisible = allMetrics.slice(0, 6).map(m => m.id);
    const defaultOrder = allMetrics.map(m => m.id);
    setVisibleMetrics(defaultVisible);
    setMetricOrder(defaultOrder);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Metrics">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose which metrics to display and drag to reorder them.
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedMetrics.map((metric) => {
              const Icon = metric.icon;
              const isVisible = visibleMetrics.includes(metric.id);

              return (
                <div
                  key={metric.id}
                  draggable
                  onDragStart={() => handleDragStart(metric.id)}
                  onDragOver={(e) => handleDragOver(e, metric.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#3a3a3a]/50 border border-gray-200 dark:border-[#4a4a4a] rounded-lg cursor-move hover:border-gray-300 dark:hover:border-[#5a5a5a] hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-all ${
                    draggedItem === metric.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />

                  <div className={`w-8 h-8 ${metric.iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${metric.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {metric.label}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleMetric(metric.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isVisible
                        ? 'bg-gray-700 dark:bg-[#4a4a4a] text-white'
                        : 'bg-gray-200 dark:bg-dark text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {isVisible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Reset to Default
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:shadow-lg text-white rounded-lg transition-all text-sm font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
