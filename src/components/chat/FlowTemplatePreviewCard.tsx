import { Mail, Tag, Sparkles, ChevronRight } from 'lucide-react';

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
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
    }
    if (badge === 'Shipped') {
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600';
    }
    if (badge === 'Delivered') {
      return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600';
    }
    if (badge === 'Delivery Exception') {
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600';
    }
    if (badge === 'Need Reason' || badge === 'Need Confirm' || badge === 'Need WEN') {
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600';
    }
    if (badge === 'Warranty Issue') {
      return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600';
    }
    return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  };

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left transition-all duration-200 hover:scale-[1.02]"
    >
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all">
        {isRecommended && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full text-white text-[10px] font-semibold shadow-lg">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Best Match</span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20 flex items-center justify-center border border-rose-200 dark:border-rose-800">
                <Mail className="w-5 h-5 text-rose-600 dark:text-rose-400" />
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
                <div className="flex flex-wrap gap-1.5">
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
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      +{template.badges.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
