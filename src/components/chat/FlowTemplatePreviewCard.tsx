import { Mail, Tag, ChevronRight } from 'lucide-react';

interface FlowTemplatePreviewCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    badges?: string[];
    category: string;
  };
  onClick: () => void;
  isRecommended?: boolean;
}

export function FlowTemplatePreviewCard({ template, onClick, isRecommended = false }: FlowTemplatePreviewCardProps) {
  const getBadgeStyle = (badge: string) => {
    if (badge === 'Not Shipped') {
      return 'bg-slate-50 dark:bg-[#2a2a2a] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#3a3a3a]';
    }
    if (badge === 'Shipped') {
      return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700';
    }
    if (badge === 'Delivered') {
      return 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-700';
    }
    if (badge === 'Delivery Exception') {
      return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700';
    }
    if (badge === 'Need Reason' || badge === 'Need Confirm' || badge === 'Need WEN') {
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700';
    }
    if (badge === 'Warranty Issue') {
      return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700';
    }
    return 'bg-gray-50 dark:bg-dark/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#3a3a3a]';
  };

  return (
    <button
      onClick={onClick}
      className="group relative w-full max-w-2xl text-left transition-all duration-200"
    >
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all">
        {isRecommended && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white text-[10px] font-semibold shadow-sm">
              <span>Best Match</span>
            </div>
          </div>
        )}

        <div className="relative p-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#3a3a3a] flex items-center justify-center border border-gray-200 dark:border-[#4a4a4a]">
                <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {template.name}
                </h4>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-all group-hover:translate-x-0.5 flex-shrink-0" />
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                {template.description}
              </p>

              {template.badges && template.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.badges.slice(0, 3).map((badge, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded border ${getBadgeStyle(badge)}`}
                    >
                      <Tag className="w-2 h-2" />
                      {badge}
                    </span>
                  ))}
                  {template.badges.length > 3 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded bg-gray-50 dark:bg-dark/20 text-gray-600 dark:text-gray-400">
                      +{template.badges.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
