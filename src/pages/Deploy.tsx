import React, { useState } from 'react';
import { Rocket, Code, Server, Globe, ArrowRight, Check } from 'lucide-react';
import DeployButton from '@/components/DeployButton';

const Deploy: React.FC = () => {
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployStep, setDeployStep] = useState<number>(1);

  const handleDeployStart = () => {
    setDeployStep(2);
  };

  const handleDeployComplete = (url: string) => {
    setDeployedUrl(url);
    setDeployStep(4);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-medium text-gray-900 mb-2">
          Deploy Your Application
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500">Deploy your Revoa frontend to Netlify</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Deployment Steps</h2>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${deployStep >= 1 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start">
                  <div className={`p-2 rounded-full ${deployStep >= 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mr-3`}>
                    {deployStep > 1 ? <Check className="w-5 h-5" /> : <Code className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Build Application</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your application will be built with optimized production settings.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className={`p-4 rounded-lg border ${deployStep >= 2 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start">
                  <div className={`p-2 rounded-full ${deployStep >= 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mr-3`}>
                    {deployStep > 2 ? <Check className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Upload to Netlify</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your built files will be uploaded to Netlify's global CDN.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className={`p-4 rounded-lg border ${deployStep >= 3 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start">
                  <div className={`p-2 rounded-full ${deployStep >= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mr-3`}>
                    {deployStep > 3 ? <Check className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Deploy Live</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your application will be deployed and accessible via a public URL.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {deployedUrl && (
              <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-lg">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-green-100 text-green-600 mr-3">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Deployment Successful!</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your application is now live at:
                    </p>
                    <a 
                      href={deployedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
                    >
                      {deployedUrl} <span className="text-xs">(opens in new tab)</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Deployment Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Build Command
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <code className="text-sm text-gray-800">npm run build</code>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Directory
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <code className="text-sm text-gray-800">dist</code>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Node Version
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <code className="text-sm text-gray-800">18.x</code>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Deploy Now</h2>
            <p className="text-sm text-gray-600 mb-6">
              Click the button below to deploy your application to Netlify. This will make your application accessible via a public URL.
            </p>
            
            <div className="flex justify-center">
              <DeployButton 
                onDeployStart={handleDeployStart}
                onDeployComplete={handleDeployComplete}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Deployment Benefits</h2>
            
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="p-1 rounded-full bg-green-100 text-green-600 mr-2 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-600">Global CDN for fast loading</span>
              </li>
              <li className="flex items-start">
                <div className="p-1 rounded-full bg-green-100 text-green-600 mr-2 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-600">Automatic HTTPS</span>
              </li>
              <li className="flex items-start">
                <div className="p-1 rounded-full bg-green-100 text-green-600 mr-2 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-600">Continuous deployment</span>
              </li>
              <li className="flex items-start">
                <div className="p-1 rounded-full bg-green-100 text-green-600 mr-2 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-600">Instant rollbacks</span>
              </li>
              <li className="flex items-start">
                <div className="p-1 rounded-full bg-green-100 text-green-600 mr-2 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-600">Custom domains</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deploy;