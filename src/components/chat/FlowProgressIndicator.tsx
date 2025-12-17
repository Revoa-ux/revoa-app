interface FlowProgressIndicatorProps {
  current: number;
  total: number;
  percentage: number;
}

export function FlowProgressIndicator({
  percentage,
}: FlowProgressIndicatorProps) {
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/30 rounded-t-lg overflow-hidden">
      <div
        className="h-full bg-white transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
