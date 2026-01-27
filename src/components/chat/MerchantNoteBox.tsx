import { AlertCircle, Info, Lightbulb, X } from 'lucide-react';
import { useState } from 'react';

interface MerchantNoteBoxProps {
  type?: 'warning' | 'info' | 'tip';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  className?: string;
}

export function MerchantNoteBox({
  type = 'info',
  title,
  children,
  dismissible = false,
  className = ''
}: MerchantNoteBoxProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const styles = {
    warning: {
      container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
      icon: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-900 dark:text-amber-100',
      text: 'text-amber-800 dark:text-amber-200',
      IconComponent: AlertCircle
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      text: 'text-blue-800 dark:text-blue-200',
      IconComponent: Info
    },
    tip: {
      container: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-900 dark:text-green-100',
      text: 'text-green-800 dark:text-green-200',
      IconComponent: Lightbulb
    }
  };

  const style = styles[type];
  const Icon = style.IconComponent;

  return (
    <div className={`relative rounded-lg border ${style.container} p-4 my-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${style.icon}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`text-sm font-semibold mb-1 ${style.title}`}>
              {title}
            </h4>
          )}
          <div className={`text-sm ${style.text} space-y-1`}>
            {children}
          </div>
        </div>

        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className={`flex-shrink-0 ${style.icon} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Utility component for inline merchant instructions
export function MerchantInstruction({
  children,
  example
}: {
  children: React.ReactNode;
  example?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium">{children}</p>
      {example && (
        <p className="italic text-sm opacity-80">
          Example: {example}
        </p>
      )}
    </div>
  );
}

// Utility component for field reminders
export function FieldReminder({
  fieldName,
  description
}: {
  fieldName: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded bg-white/50 dark:bg-dark/50">
      <span className="font-mono text-xs bg-gray-200 dark:bg-[#3a3a3a] px-1.5 py-0.5 rounded">
        {`{{${fieldName}}}`}
      </span>
      <span className="text-xs flex-1">{description}</span>
    </div>
  );
}
