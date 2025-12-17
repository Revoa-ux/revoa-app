interface FlowProgressIndicatorProps {
  current: number;
  total: number;
  percentage: number;
}

export function FlowProgressIndicator({
  percentage,
}: FlowProgressIndicatorProps) {
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-rose-500 to-pink-600 transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
