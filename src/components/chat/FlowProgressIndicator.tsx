interface FlowProgressIndicatorProps {
  current: number;
  total: number;
  percentage: number;
}

export function FlowProgressIndicator({
  percentage,
}: FlowProgressIndicatorProps) {
  return (
    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
