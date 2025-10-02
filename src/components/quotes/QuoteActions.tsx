import React from 'react';
import { MoreVertical, Eye, Download, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface QuoteActionsProps {
  quoteId: string;
  status: string;
  onView?: (id: string) => void;
  onDownload?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  quoteId,
  status,
  onView,
  onDownload,
  onAccept,
  onReject,
  onDelete
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {onView && (
              <button
                onClick={() => {
                  onView(quoteId);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            )}
            {onDownload && (
              <button
                onClick={() => {
                  onDownload(quoteId);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
            {status === 'quoted' && onAccept && (
              <button
                onClick={() => {
                  onAccept(quoteId);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Accept Quote
              </button>
            )}
            {status === 'quoted' && onReject && (
              <button
                onClick={() => {
                  onReject(quoteId);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject Quote
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(quoteId);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
