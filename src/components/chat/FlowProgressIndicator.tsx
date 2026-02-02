interface FlowProgressIndicatorProps {
  current: number;
  total: number;
  percentage: number;
}

export function FlowProgressIndicator({
  percentage,
}: FlowProgressIndicatorProps) {
  return (
    <div className="h-1.5 bg-gray-100 dark:bg-[#3a3a3a] overflow-hidden relative">
      <div
        className="h-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 transition-all duration-500 ease-out relative overflow-hidden"
        style={{ width: `${percentage}%` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.25)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.3)_0%,transparent_50%)]"></div>
      </div>
    </div>
  );
}
