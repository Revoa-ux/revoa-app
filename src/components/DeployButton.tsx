import React, { useState } from 'react';
import { Rocket, Loader2, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getDeploymentStatus } from '@/lib/deployment';

interface DeployButtonProps {
  onDeployStart?: () => void;
  onDeployComplete?: (url: string) => void;
}

const DeployButton: React.FC<DeployButtonProps> = ({ 
  onDeployStart, 
  onDeployComplete 
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployId, setDeployId] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      if (onDeployStart) onDeployStart();
      
      toast.info('Starting deployment to Netlify...', {
        duration: 3000,
      });

      // Clear any existing interval
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }

      // Start checking deployment status
      const interval = setInterval(async () => {
        if (!deployId) return;
        
        try {
          const status = await getDeploymentStatus({ id: deployId });
          
          if (status.state === 'ready') {
            clearInterval(interval);
            setIsDeploying(false);
            setDeployUrl(status.deploy_url);
            
            toast.success('Deployment successful!', {
              description: 'Your site is now live.',
            });
            
            if (onDeployComplete) onDeployComplete(status.deploy_url);
            
            // If the site was claimed, show a different message
            if (status.claimed) {
              toast.info('Your site has been transferred to your Netlify account.', {
                duration: 5000,
              });
            }
          } else if (status.state === 'error') {
            clearInterval(interval);
            setIsDeploying(false);
            
            toast.error('Deployment failed', {
              description: status.error_message || 'Please try again later.',
            });
          }
        } catch (error) {
          console.error('Error checking deployment status:', error);
        }
      }, 3000);
      
      setStatusCheckInterval(interval);
      
      // Simulate a successful deployment for demo purposes
      // In a real implementation, this would be an actual API call to Netlify
      setTimeout(() => {
        const mockDeployId = `deploy-${Date.now()}`;
        setDeployId(mockDeployId);
        
        // Simulate a successful deployment after 5 seconds
        setTimeout(() => {
          const mockDeployUrl = `https://revoa-frontend-${mockDeployId.slice(-6)}.netlify.app`;
          setDeployUrl(mockDeployUrl);
          setIsDeploying(false);
          clearInterval(interval);
          
          toast.success('Deployment successful!', {
            description: 'Your site is now live.',
          });
          
          if (onDeployComplete) onDeployComplete(mockDeployUrl);
        }, 5000);
      }, 2000);
      
    } catch (error) {
      console.error('Deployment error:', error);
      setIsDeploying(false);
      
      toast.error('Deployment failed', {
        description: 'Please try again later.',
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-500 text-white rounded-lg hover:opacity-90 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeploying ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Deploying...</span>
          </>
        ) : deployUrl ? (
          <>
            <Check className="w-5 h-5" />
            <span>Deployed</span>
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            <span>Deploy to Netlify</span>
          </>
        )}
      </button>
      
      {deployUrl && (
        <a
          href={deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          Visit your site
          <ExternalLink className="w-4 h-4 ml-1" />
        </a>
      )}
    </div>
  );
};

export default DeployButton;