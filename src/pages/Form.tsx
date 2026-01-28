import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Widget } from '@typeform/embed-react';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, ArrowLeft } from 'lucide-react';

const TYPEFORM_ID = import.meta.env.VITE_TYPEFORM_HELP_FORM_ID || '01KFKMP2DGR2750VQAZEYP3M60';

export default function Form() {
  const [searchParams] = useSearchParams();

  const campaign = searchParams.get('campaign') || '';
  const platform = searchParams.get('platform') || '';
  const action = searchParams.get('action') || '';
  const suggestion = searchParams.get('suggestion') || '';
  const source = searchParams.get('source') || '';

  const hasContext = campaign || platform || action || suggestion;

  const hiddenFields: Record<string, string> = {};
  if (campaign) hiddenFields.campaign = campaign;
  if (platform) hiddenFields.platform = platform;
  if (action) hiddenFields.action = action;
  if (suggestion) hiddenFields.suggestion = suggestion;
  if (source) hiddenFields.source = source;

  const getPlatformLabel = (p: string) => {
    switch (p.toLowerCase()) {
      case 'facebook': return 'Meta/Facebook';
      case 'google': return 'Google Ads';
      case 'tiktok': return 'TikTok Ads';
      default: return p;
    }
  };

  return (
    <>
      <Helmet>
        <title>Get Help | Revoa</title>
      </Helmet>
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: '#fafafa',
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 4px,
            rgba(0, 0, 0, 0.03) 4px,
            rgba(0, 0, 0, 0.03) 5px
          )`
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </a>

            {hasContext && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-gray-100">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium text-gray-900 mb-2">
                      You're requesting help with:
                    </h2>
                    {action && (
                      <p className="text-base font-semibold text-gray-800 mb-1">
                        {action}
                      </p>
                    )}
                    {campaign && platform && (
                      <p className="text-sm text-gray-600 mb-2">
                        Campaign: <span className="font-medium">{campaign}</span> ({getPlatformLabel(platform)})
                      </p>
                    )}
                    {suggestion && (
                      <p className="text-sm text-gray-500 italic">
                        "{suggestion}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
              <Widget
                id={TYPEFORM_ID}
                style={{ width: '100%', height: '100%' }}
                hidden={hiddenFields}
              />
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Our team typically responds within 24 hours during business days.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
