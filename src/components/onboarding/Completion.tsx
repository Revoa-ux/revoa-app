import React from 'react';
import { CheckCircle } from 'lucide-react';

interface CompletionProps {
  onComplete: () => void;
}

const Completion: React.FC<CompletionProps> = ({ onComplete }) => {
  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
            <CheckCircle className="h-8 w-8 text-gray-900" />
          </div>
          <h2 className="text-3xl font-medium text-gray-900">Setup Complete</h2>
          <p className="mt-2 text-gray-600 max-w-md mx-auto">
            Your account is now set up and ready to use.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Completion;