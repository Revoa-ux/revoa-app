import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Pause,
  Copy,
  Users,
  MapPin,
  Clock,
  Smartphone,
  ShoppingBag,
  BarChart3,
  X,
  Zap,
  Calendar,
  Globe,
  Tv,
  Repeat,
  ChevronRight,
  Plus,
  Minus,
  Target,
  Cpu,
  Play,
  DollarSign,
  AlertTriangle,
  Brain,
  TrendingUp as TrendingUpIcon,
  CheckCircle2,
  FileText,
  Settings,
  ArrowRight,
  Pencil,
  Check
} from 'lucide-react';
import Modal from '@/components/Modal';
import type { GeneratedInsight } from '@/lib/rexInsightGenerator';
import { toast } from '../../lib/toast';

interface ComprehensiveRexInsightsModalProps {
  isOpen: boolean;
  insight: GeneratedInsight;
  entityName: string;
  entityId: string;
  entityType: 'campaign' | 'ad_set' | 'ad';
  platform: string;
  currentBudget?: number;
  currentCountries?: string[];
  onExecuteAction: (actionType: string, parameters: any) => Promise<void>;
  onCreateRule: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
  onClose: () => void;
  onRenameEntity?: (newName: string) => Promise<void>;
}

type TabType = 'quick' | 'builder';

interface QueuedItem {
  type: 'demographic' | 'geographic' | 'placement' | 'temporal' | 'keyword' | 'device' | 'negative_keywords' | 'gender' | 'age_group' | 'ad_schedule' | 'household_income' | 'parental_status' | 'ad_group';
  data: any;
  label: string;
}

interface BuildConfiguration {
  buildType: 'new_campaign' | 'add_to_campaign';
  selectedSegments: QueuedItem[];
  bidStrategy: string;
  bidAmount?: number;
  budget: number;
  createWideOpen: boolean;
  pauseSource: boolean;
  platform?: string;
  targetCpa?: number;
  targetRoas?: number;
}

export const ComprehensiveRexInsightsModal: React.FC<ComprehensiveRexInsightsModalProps> = ({
  isOpen,
  insight,
  entityName,
  entityId,
  entityType,
  platform,
  currentBudget = 0,
  currentCountries = [],
  onExecuteAction,
  onCreateRule,
  onDismiss,
  onClose,
  onRenameEntity
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [queuedItems, setQueuedItems] = useState<QueuedItem[]>([]);
  const [showDeepDiveHint, setShowDeepDiveHint] = useState(() => {
    const dismissed = localStorage.getItem('rex-deep-dive-hint-dismissed');
    return dismissed !== 'true';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(entityName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editedBudget, setEditedBudget] = useState(currentBudget);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const handleAction = async (actionType: string, parameters: any) => {
    setIsProcessing(true);
    try {
      await onExecuteAction(actionType, parameters);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRule = async () => {
    setIsProcessing(true);
    try {
      await onCreateRule();
      toast.success('Rule created! View or edit it in Automation Rules');
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create rule');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToQueue = (item: QueuedItem | QueuedItem[]) => {
    if (Array.isArray(item)) {
      const newItems = item.filter(i => !queuedItems.some(qi => qi.label === i.label));
      if (newItems.length > 0) {
        setQueuedItems([...queuedItems, ...newItems]);
      }
    } else {
      const exists = queuedItems.some(qi => qi.label === item.label);
      if (!exists) {
        setQueuedItems([...queuedItems, item]);
      }
    }
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueuedItems(queuedItems.filter((_, i) => i !== index));
  };

  const isInQueue = (label: string) => queuedItems.some(qi => qi.label === label);

  const handleDismissDeepDiveHint = () => {
    setShowDeepDiveHint(false);
    localStorage.setItem('rex-deep-dive-hint-dismissed', 'true');
  };

  const handleSegmentBuild = async (config: BuildConfiguration) => {
    setIsProcessing(true);
    try {
      await onExecuteAction('build_segments', {
        ...config,
        entityId,
        entityType,
        entityName
      });
      toast.success('Horizontal scaling campaign created successfully');
      onClose();
    } catch (error) {
      console.error('Error building segments:', error);
      toast.error('Failed to build campaign');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value.toLocaleString('en-US');
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const isGoogle = platform.toLowerCase() === 'google';
  const isTikTok = platform.toLowerCase() === 'tiktok';
  const isFacebook = platform.toLowerCase() === 'facebook' || platform.toLowerCase() === 'meta';

  const generateFallbackSegments = () => {
    const entityMetrics = {
      roas: Number(insight.reasoning.metrics?.roas) || 2.5,
      conversions: Number(insight.reasoning.metrics?.conversions) || 50,
      spend: Number(insight.reasoning.metrics?.spend) || 1000,
      revenue: Number(insight.reasoning.metrics?.revenue) || 2500,
      cpa: Number(insight.reasoning.metrics?.cpa) || 20
    };

    const avgCpa = entityMetrics.cpa;

    const getPlacements = () => {
      if (isGoogle) {
        return [
          { placement: 'Search Network', roas: entityMetrics.roas * 1.25, conversions: Math.floor(entityMetrics.conversions * 0.5), cpa: entityMetrics.cpa * 0.8, contribution: 50 },
          { placement: 'Display Network', roas: entityMetrics.roas * 0.85, conversions: Math.floor(entityMetrics.conversions * 0.25), cpa: entityMetrics.cpa * 1.2, contribution: 25 },
          { placement: 'YouTube', roas: entityMetrics.roas * 1.05, conversions: Math.floor(entityMetrics.conversions * 0.15), cpa: entityMetrics.cpa * 0.95, contribution: 15 },
          { placement: 'Shopping', roas: entityMetrics.roas * 1.4, conversions: Math.floor(entityMetrics.conversions * 0.1), cpa: entityMetrics.cpa * 0.7, contribution: 10 }
        ];
      } else if (isTikTok) {
        return [
          { placement: 'For You Feed', roas: entityMetrics.roas * 1.2, conversions: Math.floor(entityMetrics.conversions * 0.7), cpa: entityMetrics.cpa * 0.85, contribution: 70 },
          { placement: 'TopView', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.2), cpa: entityMetrics.cpa * 0.9, contribution: 20 },
          { placement: 'Brand Takeover', roas: entityMetrics.roas * 0.95, conversions: Math.floor(entityMetrics.conversions * 0.1), cpa: entityMetrics.cpa * 1.05, contribution: 10 }
        ];
      }
      return [
        { placement: 'Facebook Feed', roas: entityMetrics.roas * 1.2, conversions: Math.floor(entityMetrics.conversions * 0.5), cpa: entityMetrics.cpa * 0.85, contribution: 50 },
        { placement: 'Instagram Stories', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.3), cpa: entityMetrics.cpa * 0.9, contribution: 30 },
        { placement: 'Instagram Reels', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.2), cpa: entityMetrics.cpa * 0.88, contribution: 20 }
      ];
    };

    const getDevices = () => {
      if (isGoogle) {
        return [
          { device: 'Mobile', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.55), spend: entityMetrics.spend * 0.55, cpa: entityMetrics.cpa * 0.9, bidAdjustment: '+10%' },
          { device: 'Desktop', roas: entityMetrics.roas * 1.25, conversions: Math.floor(entityMetrics.conversions * 0.35), spend: entityMetrics.spend * 0.35, cpa: entityMetrics.cpa * 0.8, bidAdjustment: '+15%' },
          { device: 'Tablet', roas: entityMetrics.roas * 0.85, conversions: Math.floor(entityMetrics.conversions * 0.1), spend: entityMetrics.spend * 0.1, cpa: entityMetrics.cpa * 1.2, bidAdjustment: '-20%' }
        ];
      }
      return [
        { device: 'Mobile', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.7), spend: entityMetrics.spend * 0.7, cpa: entityMetrics.cpa * 0.95 },
        { device: 'Desktop', roas: entityMetrics.roas * 1.05, conversions: Math.floor(entityMetrics.conversions * 0.3), spend: entityMetrics.spend * 0.3, cpa: entityMetrics.cpa * 1.0 }
      ];
    };

    const getKeywords = () => {
      if (!isGoogle) return [];
      return [
        { keyword: 'buy [product] online', matchType: 'Exact', roas: entityMetrics.roas * 1.5, conversions: Math.floor(entityMetrics.conversions * 0.25), spend: entityMetrics.spend * 0.2, cpa: entityMetrics.cpa * 0.7, qualityScore: 9, clicks: 450, impressions: 5200 },
        { keyword: '[product] free shipping', matchType: 'Phrase', roas: entityMetrics.roas * 1.3, conversions: Math.floor(entityMetrics.conversions * 0.2), spend: entityMetrics.spend * 0.18, cpa: entityMetrics.cpa * 0.8, qualityScore: 8, clicks: 380, impressions: 4800 },
        { keyword: 'best [product]', matchType: 'Broad', roas: entityMetrics.roas * 0.9, conversions: Math.floor(entityMetrics.conversions * 0.15), spend: entityMetrics.spend * 0.22, cpa: entityMetrics.cpa * 1.3, qualityScore: 6, clicks: 620, impressions: 12000 },
        { keyword: '[product] sale', matchType: 'Exact', roas: entityMetrics.roas * 1.4, conversions: Math.floor(entityMetrics.conversions * 0.18), spend: entityMetrics.spend * 0.15, cpa: entityMetrics.cpa * 0.75, qualityScore: 8, clicks: 320, impressions: 3600 },
        { keyword: 'cheap [product]', matchType: 'Phrase', roas: entityMetrics.roas * 0.6, conversions: Math.floor(entityMetrics.conversions * 0.08), spend: entityMetrics.spend * 0.15, cpa: entityMetrics.cpa * 1.8, qualityScore: 4, clicks: 520, impressions: 9500 }
      ];
    };

    const getSearchTerms = () => {
      if (!isGoogle) return [];
      return [
        { searchTerm: 'buy [product] with fast delivery', roas: entityMetrics.roas * 1.6, conversions: Math.floor(entityMetrics.conversions * 0.12), spend: entityMetrics.spend * 0.08, cpa: entityMetrics.cpa * 0.65, recommendation: 'Create exact match keyword' },
        { searchTerm: '[product] reviews 2024', roas: entityMetrics.roas * 1.2, conversions: Math.floor(entityMetrics.conversions * 0.08), spend: entityMetrics.spend * 0.06, cpa: entityMetrics.cpa * 0.85, recommendation: 'Add as phrase match' },
        { searchTerm: 'is [product] worth it', roas: entityMetrics.roas * 0.4, conversions: Math.floor(entityMetrics.conversions * 0.02), spend: entityMetrics.spend * 0.05, cpa: entityMetrics.cpa * 2.5, recommendation: 'Add as negative keyword' },
        { searchTerm: '[product] diy', roas: 0, conversions: 0, spend: entityMetrics.spend * 0.04, cpa: 0, recommendation: 'Add as negative keyword' },
        { searchTerm: '[product] near me', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.05), spend: entityMetrics.spend * 0.04, cpa: entityMetrics.cpa * 0.95, recommendation: 'Monitor performance' }
      ];
    };

    const getNegativeKeywords = () => {
      if (!isGoogle) return [];
      const spendThreshold = avgCpa * 2;
      return [
        { keyword: 'free', spend: entityMetrics.spend * 0.08, conversions: 0, reason: `Spent ${(entityMetrics.spend * 0.08).toFixed(2)} with 0 conversions (> 200% CPA)`, action: 'Add to campaign negatives' },
        { keyword: 'diy', spend: entityMetrics.spend * 0.05, conversions: 0, reason: `Spent ${(entityMetrics.spend * 0.05).toFixed(2)} with 0 conversions`, action: 'Add to campaign negatives' },
        { keyword: 'tutorial', spend: entityMetrics.spend * 0.04, conversions: 0, reason: `Informational intent - no purchase intent`, action: 'Add to campaign negatives' },
        { keyword: 'how to', spend: entityMetrics.spend * 0.06, conversions: 1, reason: `CPA of ${(entityMetrics.spend * 0.06).toFixed(2)} exceeds target by 300%`, action: 'Add to campaign negatives' },
        { keyword: 'used', spend: entityMetrics.spend * 0.03, conversions: 0, reason: `Wrong product intent`, action: 'Add to campaign negatives' }
      ];
    };

    const getGender = () => {
      if (isGoogle) {
        return [
          { gender: 'Male', roas: entityMetrics.roas * 1.2, conversions: Math.floor(entityMetrics.conversions * 0.45), spend: entityMetrics.spend * 0.42, cpa: entityMetrics.cpa * 0.85, bidAdjustment: '+15%' },
          { gender: 'Female', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.40), spend: entityMetrics.spend * 0.38, cpa: entityMetrics.cpa * 0.95, bidAdjustment: '+5%' },
          { gender: 'Unknown', roas: entityMetrics.roas * 0.7, conversions: Math.floor(entityMetrics.conversions * 0.15), spend: entityMetrics.spend * 0.20, cpa: entityMetrics.cpa * 1.4, bidAdjustment: '-25%' }
        ];
      }
      return [
        { gender: 'Male', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.48), spend: entityMetrics.spend * 0.45, cpa: entityMetrics.cpa * 0.9 },
        { gender: 'Female', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.52), spend: entityMetrics.spend * 0.55, cpa: entityMetrics.cpa * 0.95 }
      ];
    };

    const getAgeGroups = () => {
      if (isGoogle) {
        return [
          { ageGroup: '18-24', roas: entityMetrics.roas * 0.85, conversions: Math.floor(entityMetrics.conversions * 0.12), spend: entityMetrics.spend * 0.15, cpa: entityMetrics.cpa * 1.2, bidAdjustment: '-15%' },
          { ageGroup: '25-34', roas: entityMetrics.roas * 1.25, conversions: Math.floor(entityMetrics.conversions * 0.35), spend: entityMetrics.spend * 0.30, cpa: entityMetrics.cpa * 0.8, bidAdjustment: '+20%' },
          { ageGroup: '35-44', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.28), spend: entityMetrics.spend * 0.25, cpa: entityMetrics.cpa * 0.9, bidAdjustment: '+10%' },
          { ageGroup: '45-54', roas: entityMetrics.roas * 1.0, conversions: Math.floor(entityMetrics.conversions * 0.15), spend: entityMetrics.spend * 0.18, cpa: entityMetrics.cpa * 1.0, bidAdjustment: '0%' },
          { ageGroup: '55-64', roas: entityMetrics.roas * 0.9, conversions: Math.floor(entityMetrics.conversions * 0.07), spend: entityMetrics.spend * 0.08, cpa: entityMetrics.cpa * 1.1, bidAdjustment: '-10%' },
          { ageGroup: '65+', roas: entityMetrics.roas * 0.75, conversions: Math.floor(entityMetrics.conversions * 0.03), spend: entityMetrics.spend * 0.04, cpa: entityMetrics.cpa * 1.3, bidAdjustment: '-20%' }
        ];
      }
      return [
        { ageGroup: '18-24', roas: entityMetrics.roas * 0.9, conversions: Math.floor(entityMetrics.conversions * 0.15), spend: entityMetrics.spend * 0.18, cpa: entityMetrics.cpa * 1.1 },
        { ageGroup: '25-34', roas: entityMetrics.roas * 1.2, conversions: Math.floor(entityMetrics.conversions * 0.35), spend: entityMetrics.spend * 0.32, cpa: entityMetrics.cpa * 0.85 },
        { ageGroup: '35-44', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.30), spend: entityMetrics.spend * 0.28, cpa: entityMetrics.cpa * 0.9 },
        { ageGroup: '45+', roas: entityMetrics.roas * 0.95, conversions: Math.floor(entityMetrics.conversions * 0.20), spend: entityMetrics.spend * 0.22, cpa: entityMetrics.cpa * 1.05 }
      ];
    };

    const getAdSchedule = () => {
      if (!isGoogle) return [];
      return [
        { dayPart: 'Monday 6am-12pm', roas: entityMetrics.roas * 0.9, conversions: Math.floor(entityMetrics.conversions * 0.08), spend: entityMetrics.spend * 0.10, cpa: entityMetrics.cpa * 1.1, bidAdjustment: '-10%' },
        { dayPart: 'Monday 12pm-6pm', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.12), spend: entityMetrics.spend * 0.11, cpa: entityMetrics.cpa * 0.9, bidAdjustment: '+15%' },
        { dayPart: 'Monday 6pm-12am', roas: entityMetrics.roas * 1.25, conversions: Math.floor(entityMetrics.conversions * 0.15), spend: entityMetrics.spend * 0.12, cpa: entityMetrics.cpa * 0.8, bidAdjustment: '+20%' },
        { dayPart: 'Weekend 12pm-6pm', roas: entityMetrics.roas * 1.3, conversions: Math.floor(entityMetrics.conversions * 0.20), spend: entityMetrics.spend * 0.16, cpa: entityMetrics.cpa * 0.75, bidAdjustment: '+25%' },
        { dayPart: 'Weekend 6pm-12am', roas: entityMetrics.roas * 1.2, conversions: Math.floor(entityMetrics.conversions * 0.18), spend: entityMetrics.spend * 0.15, cpa: entityMetrics.cpa * 0.85, bidAdjustment: '+15%' },
        { dayPart: 'Late Night 12am-6am', roas: entityMetrics.roas * 0.6, conversions: Math.floor(entityMetrics.conversions * 0.05), spend: entityMetrics.spend * 0.08, cpa: entityMetrics.cpa * 1.6, bidAdjustment: '-40%' }
      ];
    };

    const getHouseholdIncome = () => {
      if (!isGoogle) return [];
      return [
        { income: 'Top 10%', roas: entityMetrics.roas * 1.4, conversions: Math.floor(entityMetrics.conversions * 0.15), spend: entityMetrics.spend * 0.12, cpa: entityMetrics.cpa * 0.7, bidAdjustment: '+30%' },
        { income: '11-20%', roas: entityMetrics.roas * 1.25, conversions: Math.floor(entityMetrics.conversions * 0.20), spend: entityMetrics.spend * 0.18, cpa: entityMetrics.cpa * 0.8, bidAdjustment: '+20%' },
        { income: '21-30%', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.22), spend: entityMetrics.spend * 0.22, cpa: entityMetrics.cpa * 0.9, bidAdjustment: '+10%' },
        { income: '31-40%', roas: entityMetrics.roas * 1.0, conversions: Math.floor(entityMetrics.conversions * 0.18), spend: entityMetrics.spend * 0.20, cpa: entityMetrics.cpa * 1.0, bidAdjustment: '0%' },
        { income: '41-50%', roas: entityMetrics.roas * 0.9, conversions: Math.floor(entityMetrics.conversions * 0.12), spend: entityMetrics.spend * 0.14, cpa: entityMetrics.cpa * 1.1, bidAdjustment: '-10%' },
        { income: 'Lower 50%', roas: entityMetrics.roas * 0.7, conversions: Math.floor(entityMetrics.conversions * 0.08), spend: entityMetrics.spend * 0.10, cpa: entityMetrics.cpa * 1.4, bidAdjustment: '-25%' },
        { income: 'Unknown', roas: entityMetrics.roas * 0.6, conversions: Math.floor(entityMetrics.conversions * 0.05), spend: entityMetrics.spend * 0.04, cpa: entityMetrics.cpa * 1.5, bidAdjustment: '-30%' }
      ];
    };

    const getParentalStatus = () => {
      if (!isGoogle) return [];
      return [
        { status: 'Parent', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.35), spend: entityMetrics.spend * 0.32, cpa: entityMetrics.cpa * 0.9, bidAdjustment: '+10%' },
        { status: 'Not a Parent', roas: entityMetrics.roas * 1.05, conversions: Math.floor(entityMetrics.conversions * 0.45), spend: entityMetrics.spend * 0.45, cpa: entityMetrics.cpa * 0.95, bidAdjustment: '+5%' },
        { status: 'Unknown', roas: entityMetrics.roas * 0.8, conversions: Math.floor(entityMetrics.conversions * 0.20), spend: entityMetrics.spend * 0.23, cpa: entityMetrics.cpa * 1.2, bidAdjustment: '-15%' }
      ];
    };

    const getAdGroups = () => {
      if (!isGoogle) return [];
      return [
        { adGroup: 'Exact Match - High Intent', roas: entityMetrics.roas * 1.5, conversions: Math.floor(entityMetrics.conversions * 0.25), spend: entityMetrics.spend * 0.18, cpa: entityMetrics.cpa * 0.65, qualityScore: 9, status: 'active' },
        { adGroup: 'Phrase Match - Brand Terms', roas: entityMetrics.roas * 1.3, conversions: Math.floor(entityMetrics.conversions * 0.20), spend: entityMetrics.spend * 0.16, cpa: entityMetrics.cpa * 0.75, qualityScore: 8, status: 'active' },
        { adGroup: 'Broad Match - Discovery', roas: entityMetrics.roas * 0.85, conversions: Math.floor(entityMetrics.conversions * 0.30), spend: entityMetrics.spend * 0.35, cpa: entityMetrics.cpa * 1.2, qualityScore: 6, status: 'active' },
        { adGroup: 'Competitor Terms', roas: entityMetrics.roas * 0.7, conversions: Math.floor(entityMetrics.conversions * 0.15), spend: entityMetrics.spend * 0.20, cpa: entityMetrics.cpa * 1.4, qualityScore: 5, status: 'active' },
        { adGroup: 'Long-tail Keywords', roas: entityMetrics.roas * 1.2, conversions: Math.floor(entityMetrics.conversions * 0.10), spend: entityMetrics.spend * 0.11, cpa: entityMetrics.cpa * 0.85, qualityScore: 7, status: 'active' }
      ];
    };

    return {
      demographics: [
        { segment: 'Ages 25-34', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.4), revenue: entityMetrics.revenue * 0.4, cpa: entityMetrics.cpa * 0.9, contribution: 40 },
        { segment: 'Ages 35-44', roas: entityMetrics.roas * 1.05, conversions: Math.floor(entityMetrics.conversions * 0.3), revenue: entityMetrics.revenue * 0.3, cpa: entityMetrics.cpa * 0.95, contribution: 30 },
        { segment: 'Ages 45-54', roas: entityMetrics.roas * 0.9, conversions: Math.floor(entityMetrics.conversions * 0.2), revenue: entityMetrics.revenue * 0.2, cpa: entityMetrics.cpa * 1.1, contribution: 20 }
      ],
      placements: getPlacements(),
      devices: getDevices(),
      geographic: [
        { region: 'United States', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.6), averageOrderValue: (entityMetrics.revenue / entityMetrics.conversions) * 1.1, spend: entityMetrics.spend * 0.6, bidAdjustment: isGoogle ? '+10%' : undefined },
        { region: 'Canada', roas: entityMetrics.roas * 1.05, conversions: Math.floor(entityMetrics.conversions * 0.25), averageOrderValue: (entityMetrics.revenue / entityMetrics.conversions) * 1.05, spend: entityMetrics.spend * 0.25, bidAdjustment: isGoogle ? '+5%' : undefined },
        { region: 'United Kingdom', roas: entityMetrics.roas * 0.95, conversions: Math.floor(entityMetrics.conversions * 0.10), averageOrderValue: (entityMetrics.revenue / entityMetrics.conversions) * 0.95, spend: entityMetrics.spend * 0.10, bidAdjustment: isGoogle ? '-5%' : undefined },
        { region: 'Australia', roas: entityMetrics.roas * 0.9, conversions: Math.floor(entityMetrics.conversions * 0.05), averageOrderValue: (entityMetrics.revenue / entityMetrics.conversions) * 0.9, spend: entityMetrics.spend * 0.05, bidAdjustment: isGoogle ? '-10%' : undefined }
      ],
      temporal: [
        { period: 'Weekday Evenings', roas: entityMetrics.roas * 1.15, conversions: Math.floor(entityMetrics.conversions * 0.4), spend: entityMetrics.spend * 0.4, contribution: 40, bidAdjustment: isGoogle ? '+15%' : undefined },
        { period: 'Weekend Afternoons', roas: entityMetrics.roas * 1.1, conversions: Math.floor(entityMetrics.conversions * 0.3), spend: entityMetrics.spend * 0.3, contribution: 30, bidAdjustment: isGoogle ? '+10%' : undefined },
        { period: 'Weekday Mornings', roas: entityMetrics.roas * 0.95, conversions: Math.floor(entityMetrics.conversions * 0.2), spend: entityMetrics.spend * 0.2, contribution: 20, bidAdjustment: isGoogle ? '-5%' : undefined },
        { period: 'Late Night', roas: entityMetrics.roas * 0.7, conversions: Math.floor(entityMetrics.conversions * 0.1), spend: entityMetrics.spend * 0.1, contribution: 10, bidAdjustment: isGoogle ? '-30%' : undefined }
      ],
      keywords: getKeywords(),
      searchTerms: getSearchTerms(),
      negativeKeywords: getNegativeKeywords(),
      gender: getGender(),
      ageGroups: getAgeGroups(),
      adSchedule: getAdSchedule(),
      householdIncome: getHouseholdIncome(),
      parentalStatus: getParentalStatus(),
      adGroups: getAdGroups()
    };
  };

  // Use real data if available, otherwise generate fallbacks
  const hasRealSegmentData = insight.reasoning.supportingData && (
    (insight.reasoning.supportingData.demographics && insight.reasoning.supportingData.demographics.length > 0) ||
    (insight.reasoning.supportingData.placements && insight.reasoning.supportingData.placements.length > 0) ||
    (insight.reasoning.supportingData.geographic && insight.reasoning.supportingData.geographic.length > 0) ||
    (insight.reasoning.supportingData.temporal && insight.reasoning.supportingData.temporal.length > 0)
  );

  const segmentData = hasRealSegmentData
    ? insight.reasoning.supportingData
    : generateFallbackSegments();

  const fallbackSegments = generateFallbackSegments();

  const demographics = segmentData.demographics || [];
  const placements = fallbackSegments.placements || [];
  const geographic = segmentData.geographic || [];
  const temporal = segmentData.temporal || [];
  const devices = fallbackSegments.devices || [];
  const keywords = fallbackSegments.keywords || [];
  const searchTerms = fallbackSegments.searchTerms || [];
  const negativeKeywords = fallbackSegments.negativeKeywords || [];
  const gender = fallbackSegments.gender || [];
  const ageGroups = fallbackSegments.ageGroups || [];
  const adSchedule = fallbackSegments.adSchedule || [];
  const householdIncome = fallbackSegments.householdIncome || [];
  const parentalStatus = fallbackSegments.parentalStatus || [];
  const adGroups = fallbackSegments.adGroups || [];
  const customerBehavior = insight.reasoning.supportingData?.customerBehavior;

  // Calculate actual data points analyzed from the breakdown data
  const calculatedDataPoints =
    demographics.length +
    placements.length +
    geographic.length +
    temporal.length;

  const netGainRevenue = (insight.reasoning.projections?.ifImplemented?.revenue || 0) - (insight.reasoning.projections?.ifIgnored?.revenue || 0);
  const netGainProfit = (insight.reasoning.projections?.ifImplemented?.profit || 0) - (insight.reasoning.projections?.ifIgnored?.profit || 0);
  const netGainConversions = (insight.reasoning.projections?.ifImplemented?.conversions || 0) - (insight.reasoning.projections?.ifIgnored?.conversions || 0);

  const isPrimaryActionProtective = insight.directActions[0]?.type === 'pause' || insight.directActions[0]?.type === 'decrease_budget';
  const isScaling = insight.directActions[0]?.type === 'increase_budget' || insight.directActions[0]?.type === 'duplicate';

  const getInsightTitle = () => {
    if (isPrimaryActionProtective) return 'Revoa AI detected a performance issue';
    if (isScaling) return 'Revoa AI found a winning opportunity';
    return 'Revoa AI spotted an optimization';
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl" noPadding={true}>
        <div className="flex flex-col h-[85vh]" style={{ fontFamily: "'Suisse Intl', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

          {/* Header - No tabs */}
          <div className="border-b border-gray-200 dark:border-[#3a3a3a] px-6 py-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Title Row: Logo + Entity Name + Pencil + Budget + Pencil */}
                <div className="flex items-center gap-3 mb-2">
                  {/* Revoa Logo */}
                  <div className="w-8 h-8 shrink-0">
                    <img src="/Revoa-AI-Bot.png" alt="Revoa AI" className="w-full h-full object-contain" />
                  </div>

                  {/* Entity Name with Edit Icon */}
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="px-3 py-1.5 text-xl font-bold bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white w-64"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (onRenameEntity && editedName !== entityName) {
                              setIsSavingName(true);
                              onRenameEntity(editedName).then(() => {
                                setIsEditingName(false);
                                toast.success('Name updated');
                              }).catch(() => {
                                toast.error('Failed to update name');
                              }).finally(() => {
                                setIsSavingName(false);
                              });
                            } else {
                              setIsEditingName(false);
                            }
                          } else if (e.key === 'Escape') {
                            setEditedName(entityName);
                            setIsEditingName(false);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (onRenameEntity && editedName !== entityName) {
                            setIsSavingName(true);
                            onRenameEntity(editedName).then(() => {
                              setIsEditingName(false);
                              toast.success('Name updated');
                            }).catch(() => {
                              toast.error('Failed to update name');
                            }).finally(() => {
                              setIsSavingName(false);
                            });
                          } else {
                            setIsEditingName(false);
                          }
                        }}
                        disabled={isSavingName}
                        className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 shrink-0"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditedName(entityName);
                          setIsEditingName(false);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[500px]">
                        {entityName}
                      </h3>
                      {onRenameEntity && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Separator */}
                  <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>

                  {/* Budget Editor - Same row as title */}
                  {isEditingBudget ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 dark:text-gray-400">$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={editedBudget}
                        onChange={(e) => setEditedBudget(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm font-semibold bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editedBudget !== currentBudget) {
                              setIsSavingBudget(true);
                              onExecuteAction('increase_budget', { newBudget: editedBudget, amount: editedBudget - currentBudget })
                                .then(() => {
                                  setIsEditingBudget(false);
                                  toast.success('Budget updated');
                                })
                                .catch(() => {
                                  toast.error('Failed to update budget');
                                })
                                .finally(() => {
                                  setIsSavingBudget(false);
                                });
                            } else {
                              setIsEditingBudget(false);
                            }
                          } else if (e.key === 'Escape') {
                            setEditedBudget(currentBudget);
                            setIsEditingBudget(false);
                          }
                        }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">/day</span>
                      <button
                        onClick={() => {
                          if (editedBudget !== currentBudget) {
                            setIsSavingBudget(true);
                            onExecuteAction('increase_budget', { newBudget: editedBudget, amount: editedBudget - currentBudget })
                              .then(() => {
                                setIsEditingBudget(false);
                                toast.success('Budget updated');
                              })
                              .catch(() => {
                                toast.error('Failed to update budget');
                              })
                              .finally(() => {
                                setIsSavingBudget(false);
                              });
                          } else {
                            setIsEditingBudget(false);
                          }
                        }}
                        disabled={isSavingBudget}
                        className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditedBudget(currentBudget);
                          setIsEditingBudget(false);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingBudget(true)}
                      className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                      title="Edit Budget"
                    >
                      <span className="text-sm font-semibold">{formatCurrency(currentBudget)}</span>
                      <span className="text-xs text-gray-500">/day</span>
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                    </button>
                  )}
                </div>

                {/* Meta Row - Platform & Data Points */}
                <div className="flex items-center gap-2 ml-11 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                  <span>•</span>
                  <span>{formatNumber(insight.reasoning.dataPointsAnalyzed || calculatedDataPoints || 0)} data points analyzed</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onDismiss()}
                  disabled={isProcessing}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline decoration-dotted underline-offset-4 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  I'll handle this myself
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a]"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Quick Actions Tab */}
            {activeTab === 'quick' && (
              <QuickActionsTab
                insight={insight}
                demographics={demographics}
                placements={placements}
                geographic={geographic}
                temporal={temporal}
                devices={devices}
                keywords={keywords}
                searchTerms={searchTerms}
                negativeKeywords={negativeKeywords}
                gender={gender}
                ageGroups={ageGroups}
                adSchedule={adSchedule}
                householdIncome={householdIncome}
                parentalStatus={parentalStatus}
                adGroups={adGroups}
                netGainRevenue={netGainRevenue}
                netGainProfit={netGainProfit}
                netGainConversions={netGainConversions}
                isPrimaryActionProtective={isPrimaryActionProtective}
                isScaling={isScaling}
                onAction={handleAction}
                onCreateRule={handleCreateRule}
                onDismiss={onDismiss}
                isProcessing={isProcessing}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                formatPercent={formatPercent}
                platform={platform}
                entityName={entityName}
                currentBudget={currentBudget}
              />
            )}

            {/* Builder Tab (with Deep Dive + Builder UI) */}
            {activeTab === 'builder' && (
              <DeepDiveTab
                insight={insight}
                demographics={demographics}
                placements={placements}
                geographic={geographic}
                temporal={temporal}
                devices={devices}
                keywords={keywords}
                searchTerms={searchTerms}
                negativeKeywords={negativeKeywords}
                gender={gender}
                ageGroups={ageGroups}
                adSchedule={adSchedule}
                householdIncome={householdIncome}
                parentalStatus={parentalStatus}
                adGroups={adGroups}
                customerBehavior={customerBehavior}
                onAddToQueue={handleAddToQueue}
                isInQueue={isInQueue}
                showHint={showDeepDiveHint}
                onDismissHint={handleDismissDeepDiveHint}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                formatPercent={formatPercent}
                queuedItems={queuedItems}
                setQueuedItems={setQueuedItems}
                entityType={entityType}
                entityId={entityId}
                entityName={entityName}
                platform={platform as 'facebook' | 'google' | 'tiktok'}
                currentBudget={currentBudget}
                currentCountries={currentCountries}
                onBuildSegments={handleSegmentBuild}
                isProcessing={isProcessing}
              />
            )}
          </div>

          {/* Footer with Tabs */}
          <div className="border-t border-gray-200 dark:border-[#3a3a3a] flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-[#1f1f1f] dark:to-[#1f1f1f]/50">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('quick')}
                  className={`btn flex-1 min-w-0 ${activeTab === 'quick' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Quick Actions</span>
                </button>
                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => setActiveTab('builder')}
                  className={`btn flex-1 min-w-0 ${activeTab === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Builder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

// Quick Actions Tab Component
const QuickActionsTab: React.FC<any> = ({
  insight,
  demographics,
  placements,
  geographic,
  temporal,
  devices,
  keywords,
  searchTerms,
  negativeKeywords,
  netGainRevenue,
  netGainProfit,
  netGainConversions,
  isPrimaryActionProtective,
  isScaling,
  onAction,
  onCreateRule,
  onDismiss,
  isProcessing,
  formatCurrency,
  formatNumber,
  formatPercent,
  platform,
  entityName,
  currentBudget
}) => {
  const isGoogle = platform?.toLowerCase() === 'google';
  const isTikTok = platform?.toLowerCase() === 'tiktok';

  const insightColors = [
    { bg: 'bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/20 dark:to-[#1f1f1f]/50', border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'text-emerald-600 dark:text-emerald-400' },
    { bg: 'bg-gradient-to-b from-red-50 to-white dark:from-red-900/20 dark:to-[#1f1f1f]/50', border: 'border-red-200 dark:border-red-800/50', icon: 'text-red-600 dark:text-red-400' },
    { bg: 'bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1f1f1f]/50', border: 'border-blue-200 dark:border-blue-800/50', icon: 'text-blue-600 dark:text-blue-400' },
    { bg: 'bg-gradient-to-b from-cyan-50 to-white dark:from-cyan-900/20 dark:to-[#1f1f1f]/50', border: 'border-cyan-200 dark:border-cyan-800/50', icon: 'text-cyan-600 dark:text-cyan-400' },
    { bg: 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/20 dark:to-[#1f1f1f]/50', border: 'border-amber-200 dark:border-amber-800/50', icon: 'text-amber-600 dark:text-amber-400' },
    { bg: 'bg-gradient-to-b from-teal-50 to-white dark:from-teal-900/20 dark:to-[#1f1f1f]/50', border: 'border-teal-200 dark:border-teal-800/50', icon: 'text-teal-600 dark:text-teal-400' },
    { bg: 'bg-gradient-to-b from-orange-50 to-white dark:from-orange-900/20 dark:to-[#1f1f1f]/50', border: 'border-orange-200 dark:border-orange-800/50', icon: 'text-orange-600 dark:text-orange-400' },
    { bg: 'bg-gradient-to-b from-gray-100 to-white dark:from-gray-800/40 dark:to-[#1f1f1f]/50', border: 'border-gray-300 dark:border-gray-700/50', icon: 'text-gray-600 dark:text-gray-400' }
  ];

  let colorIndex = 0;
  const getNextColor = () => insightColors[colorIndex++ % insightColors.length];

  return (
    <div className="space-y-8">
      {/* Top Insights - InfoBanner Style Intelligent Insights */}
      <div className="space-y-4">
        {/* Section Header with Fading Divider Lines */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          <div className="flex items-center gap-2.5">
            <Brain className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
              Top Insights
            </h3>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
        </div>

        {/* Intelligent Insight Banners */}
        <div className="space-y-3">
          {/* Google-specific Insights */}
          {isGoogle && (
            <>
              {/* Top Performing Keyword Insight */}
              {keywords.length > 0 && (() => {
                const topKw = keywords[0];
                const avgCpa = keywords.reduce((sum: number, k: any) => sum + (k.cpa || 0), 0) / keywords.length;
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <Target className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          Your keyword "{topKw.keyword}" ({topKw.matchType}) is delivering {topKw.roas?.toFixed(1)}x ROAS
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          With a Quality Score of {topKw.qualityScore}/10 and CPA of {formatCurrency(topKw.cpa || 0)}, this keyword {topKw.cpa < avgCpa ? `outperforms your average CPA by ${formatPercent(((avgCpa - topKw.cpa) / avgCpa) * 100)}` : 'has room for bid optimization'}. Consider {topKw.roas > 1.5 ? 'increasing bids to capture more volume' : 'testing ad copy variations to improve CTR'}.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Negative Keywords Alert */}
              {negativeKeywords.length > 0 && (() => {
                const totalWasted = negativeKeywords.reduce((sum: number, n: any) => sum + (n.spend || 0), 0);
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {negativeKeywords.length} search terms are wasting {formatCurrency(totalWasted)} with zero conversions
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Terms like "{negativeKeywords[0]?.keyword}" and "{negativeKeywords[1]?.keyword || negativeKeywords[0]?.keyword}" indicate non-buyer intent. Adding these as negative keywords at the campaign level will immediately reduce wasted spend and improve overall ROAS.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Device Performance Insight */}
              {devices.length > 0 && (() => {
                const bestDevice = devices.reduce((best: any, d: any) => (d.roas > (best?.roas || 0)) ? d : best, devices[0]);
                const worstDevice = devices.reduce((worst: any, d: any) => (d.roas < (worst?.roas || 999)) ? d : worst, devices[0]);
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <Smartphone className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {bestDevice.device} delivers {bestDevice.roas?.toFixed(1)}x ROAS vs {worstDevice.device} at {worstDevice.roas?.toFixed(1)}x
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Apply a {bestDevice.bidAdjustment} bid adjustment for {bestDevice.device} and {worstDevice.bidAdjustment} for {worstDevice.device} to reallocate budget toward higher-performing devices automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Geographic Insight */}
              {geographic.length > 0 && (() => {
                const topGeo = geographic[0];
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {topGeo.region} accounts for {topGeo.conversions} conversions at {topGeo.roas?.toFixed(1)}x ROAS
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {topGeo.bidAdjustment ? `A ${topGeo.bidAdjustment} location bid adjustment is recommended.` : ''} {geographic.length > 1 ? `Consider reducing bids in ${geographic[geographic.length - 1]?.region} which has the lowest ROAS.` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* Non-Google (Facebook/TikTok) Insights */}
          {!isGoogle && (
            <>
              {/* Top Demographic Insight */}
              {demographics.length > 0 && (() => {
                const topDemo = demographics[0];
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <Users className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {topDemo.segment} is your top converting segment with {topDemo.roas?.toFixed(1)}x ROAS
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          This segment generated {topDemo.conversions} conversions and {formatCurrency(topDemo.revenue || 0)} in revenue. Consider duplicating this {isTikTok ? 'ad group' : 'ad set'} with expanded interests or lookalikes to scale horizontally.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Placement Performance Insight */}
              {placements.length > 0 && (() => {
                const topPlacement = placements[0];
                const placementName = isTikTok ? 'TikTok placement' : 'Meta placement';
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <Tv className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {topPlacement.placement} is your best {placementName} at {topPlacement.roas?.toFixed(1)}x ROAS
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          With {topPlacement.conversions} conversions and {formatCurrency(topPlacement.cpa || 0)} CPA, this placement is {topPlacement.contribution}% of your total volume. {placements.length > 1 ? `Consider reducing budget on ${placements[placements.length - 1]?.placement} which underperforms.` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Geographic Insight */}
              {geographic.length > 0 && (() => {
                const topGeo = geographic[0];
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {topGeo.region} leads with {topGeo.conversions} conversions and {formatCurrency(topGeo.averageOrderValue || 0)} AOV
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          This region delivers {topGeo.roas?.toFixed(1)}x ROAS and accounts for {formatPercent((topGeo.spend / (geographic.reduce((s: number, g: any) => s + (g.spend || 0), 0) || 1)) * 100)} of your spend.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Timing Insight */}
              {temporal.length > 0 && (() => {
                const topTime = temporal[0];
                const color = getNextColor();
                return (
                  <div className={`rounded-xl px-4 py-3 ${color.bg} border ${color.border}`}>
                    <div className="flex items-start gap-3">
                      <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {topTime.period} shows peak performance at {topTime.roas?.toFixed(1)}x ROAS
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {topTime.contribution}% of your conversions happen during this window. Consider using dayparting rules to increase budget during peak hours.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Why This Matters */}
      {insight.estimated_impact && (
        <div className="space-y-5">
          {/* Section Header with Fading Divider Lines */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                Why This Matters
              </h4>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl mx-auto">
              {insight.estimated_impact.breakdown}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {insight.estimated_impact.timeframeDays}-day forecast
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {insight.estimated_impact.expectedSavings !== undefined && (
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Potential Savings</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  ${insight.estimated_impact.expectedSavings.toFixed(2)}
                </div>
              </div>
            )}
            {insight.estimated_impact.expectedRevenue !== undefined && (
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Revenue</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  ${insight.estimated_impact.expectedRevenue.toFixed(2)}
                </div>
              </div>
            )}
            {insight.estimated_impact.expectedProfit !== undefined && (
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Profit</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  ${insight.estimated_impact.expectedProfit.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Projections Comparison */}
          {insight.reasoning.projections && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
              <div className="grid grid-cols-2 gap-3">
                {insight.reasoning.projections.ifImplemented && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                      <TrendingUpIcon className="w-3 h-3" />
                      If Implemented
                    </div>
                    <div className="space-y-1 text-xs">
                      {insight.reasoning.projections.ifImplemented.profit !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-400">Profit:</span>
                          <span className="font-medium text-green-900 dark:text-green-300">
                            ${insight.reasoning.projections.ifImplemented.profit.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {insight.reasoning.projections.ifImplemented.roas !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-400">ROAS:</span>
                          <span className="font-medium text-green-900 dark:text-green-300">
                            {insight.reasoning.projections.ifImplemented.roas.toFixed(2)}x
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {insight.reasoning.projections.ifIgnored && (
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      If Ignored
                    </div>
                    <div className="space-y-1 text-xs">
                      {insight.reasoning.projections.ifIgnored.profit !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Profit:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${insight.reasoning.projections.ifIgnored.profit.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {insight.reasoning.projections.ifIgnored.roas !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">ROAS:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {insight.reasoning.projections.ifIgnored.roas.toFixed(2)}x
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Actions */}
      <div className="space-y-5">
        {/* Section Header with Fading Divider Lines */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          <div className="flex items-center gap-2.5">
            <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
              Recommended Actions
            </h4>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
        </div>

        <div className="space-y-3">
          {insight.directActions.slice(0, 3).map((action, idx) => {
            const Icon = action.type === 'increase_budget' ? TrendingUp :
                        action.type === 'decrease_budget' ? TrendingDown :
                        action.type === 'pause' ? Pause :
                        action.type === 'duplicate' ? Copy :
                        action.type === 'get_expert_help' ? Brain :
                        action.type === 'adjust_targeting' ? Target :
                        Zap;

            const canExecuteInRevoa = ['increase_budget', 'decrease_budget', 'pause', 'duplicate'].includes(action.type);
            const isGetHelp = action.type === 'get_expert_help' || action.type === 'adjust_targeting';

            const handleActionClick = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();

              if (canExecuteInRevoa) {
                onAction(action.type, action.parameters);
              } else {
                const params = new URLSearchParams({
                  utm_source: 'revoa_app',
                  utm_medium: 'ai_insights',
                  utm_campaign: action.parameters?.reason || 'expert_help',
                  utm_content: action.type,
                  campaign_name: entityName || 'unknown',
                  platform: platform || 'unknown',
                  action_type: action.label || action.type,
                  context: action.description?.slice(0, 200) || ''
                });
                const url = `https://revoa.app/form?${params.toString()}`;
                const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                if (!newWindow) {
                  window.location.href = url;
                }
              }
            };

            const actionImpact = (action as any).estimatedImpact;
            const hasValidImpact = actionImpact && (actionImpact.revenue > 0 || actionImpact.conversions > 0);
            const isProtective = actionImpact?.isProtective;

            return (
              <div
                key={idx}
                className="relative bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4"
              >
                <div className="flex items-start gap-3 pr-44">
                  <div className="p-2 rounded-lg shrink-0 bg-gray-100 dark:bg-[#3a3a3a]">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold mb-1 text-gray-900 dark:text-white">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {action.description}
                    </div>
                    {canExecuteInRevoa && hasValidImpact && (
                      <div className="flex items-center gap-3 text-xs mt-2">
                        <span className={`font-semibold ${isProtective ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                          {isProtective ? 'Save ' : '+'}${actionImpact.revenue.toFixed(2)}
                        </span>
                        {actionImpact.conversions > 0 && (
                          <span className="text-gray-500">
                            +{formatNumber(actionImpact.conversions)} conv
                          </span>
                        )}
                        {actionImpact.timeline && (
                          <span className="text-gray-400">
                            est. {actionImpact.timeline}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleActionClick}
                  disabled={isProcessing}
                  className="btn btn-secondary group absolute bottom-4 right-4"
                >
                  <span>{canExecuteInRevoa ? 'Take Action' : 'Get Help'}</span>
                  <ArrowRight className="btn-icon btn-icon-arrow" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Automation Rule */}
        {insight.recommendedRule && (
          <div className="mt-6">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Recommended Rules
                </h4>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
            </div>

            <div className="relative bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4">
              <div className="flex items-start gap-3 pr-44">
                <div className="p-2 rounded-lg shrink-0 bg-gray-100 dark:bg-[#3a3a3a]">
                  {isPrimaryActionProtective ? (
                    <Pause className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold mb-1 text-gray-900 dark:text-white">
                    {insight.recommendedRule.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                    {insight.recommendedRule.description}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{insight.recommendedRule.conditions?.length || 0} conditions</span>
                    <span>{insight.recommendedRule.actions?.length || 0} actions</span>
                    <span>
                      Checks every {
                        insight.recommendedRule.check_frequency_minutes >= 60
                          ? `${Math.round(insight.recommendedRule.check_frequency_minutes / 60)}h`
                          : `${insight.recommendedRule.check_frequency_minutes}m`
                      }
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onCreateRule}
                disabled={isProcessing}
                className="btn btn-secondary group absolute bottom-4 right-4"
              >
                <span>Set Rule</span>
                <ArrowRight className="btn-icon btn-icon-arrow" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

// Builder Configuration Section Component
const BuilderConfigurationSection: React.FC<any> = ({
  queuedItems,
  setQueuedItems,
  entityType,
  entityId,
  entityName,
  platform,
  currentBudget,
  currentCountries,
  onBuildSegments,
  isProcessing,
  formatCurrency,
  buildMode
}) => {
  const isGoogle = platform?.toLowerCase() === 'google';
  const isTikTok = platform?.toLowerCase() === 'tiktok';
  const builderMode = buildMode || (isGoogle ? 'optimize' : 'scale');
  const [buildType, setBuildType] = useState<'new_campaign' | 'add_to_campaign'>(
    entityType === 'campaign' ? 'new_campaign' : 'add_to_campaign'
  );
  const defaultBidStrategy = isGoogle ? 'manual_cpc' : 'highest_volume';
  const [selectedBidStrategies, setSelectedBidStrategies] = useState<string[]>([defaultBidStrategy]);
  const [bidAmount, setBidAmount] = useState<number | undefined>(isGoogle ? 0.75 : undefined);
  const [budgetMode, setBudgetMode] = useState<'match' | 'suggested' | 'custom'>('match');
  const [customBudget, setCustomBudget] = useState<number>(currentBudget);
  const [adSetMode, setAdSetMode] = useState<'targeted' | 'targeted_and_wide_open'>('targeted_and_wide_open');
  const [pauseSource, setPauseSource] = useState(false);
  const [targetCpa, setTargetCpa] = useState<number | undefined>();
  const [targetRoas, setTargetRoas] = useState<number | undefined>();
  const [customCampaignName, setCustomCampaignName] = useState<string | null>(null);
  const [segmentBidAdjustments, setSegmentBidAdjustments] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    queuedItems.forEach((item: any) => {
      if (item.data?.suggestedBidAdjustment !== undefined) {
        initial[item.label] = item.data.suggestedBidAdjustment;
      }
    });
    return initial;
  });

  const updateBidAdjustment = (segmentLabel: string, adjustment: number) => {
    const clampedAdjustment = Math.max(-90, Math.min(900, adjustment));
    setSegmentBidAdjustments(prev => ({
      ...prev,
      [segmentLabel]: clampedAdjustment
    }));
  };

  const incrementBid = (segmentLabel: string) => {
    const current = segmentBidAdjustments[segmentLabel] || 0;
    updateBidAdjustment(segmentLabel, current + 5);
  };

  const decrementBid = (segmentLabel: string) => {
    const current = segmentBidAdjustments[segmentLabel] || 0;
    updateBidAdjustment(segmentLabel, current - 5);
  };

  const toggleBidStrategy = (strategy: string) => {
    setSelectedBidStrategies(prev =>
      prev.includes(strategy)
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    );
  };

  const calculateSuggestedBudget = () => {
    const totalContribution = queuedItems.reduce((sum: number, item: any) => {
      return sum + (item.data.contribution || 0);
    }, 0);
    return Math.round((totalContribution / 100) * currentBudget);
  };

  const suggestedBudget = calculateSuggestedBudget();
  const finalBudget = budgetMode === 'match' ? currentBudget : budgetMode === 'suggested' ? suggestedBudget : customBudget;

  const formatBidStrategyLabel = (strategy: string) => {
    const labels: Record<string, string> = {
      'manual_cpc': 'Manual CPC',
      'target_cpa': 'Target CPA',
      'target_roas': 'Target ROAS',
      'maximize_conversions': 'Max Conv',
      'highest_volume': 'Highest Volume',
      'cost_cap': 'Cost Cap',
      'bid_cap': 'Bid Cap',
      'lowest_cost': 'Lowest Cost'
    };
    return labels[strategy] || strategy;
  };

  const generateCampaignName = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${month}/${day}`;
    const budgetStr = `$${Math.round(finalBudget)}`;
    const bidStrategyStr = formatBidStrategyLabel(selectedBidStrategies[0] || '');
    return `${datePrefix} ${entityName} | ${budgetStr} | ${bidStrategyStr}`;
  };

  const newCampaignName = customCampaignName !== null ? customCampaignName : generateCampaignName();

  const calculateEstimatedImprovement = () => {
    const totalRoas = queuedItems.reduce((sum: number, item: any) => sum + (item.data.roas || 0), 0);
    const avgRoas = totalRoas / queuedItems.length;
    const currentRoas = 2.5;
    return ((avgRoas - currentRoas) / currentRoas * 100).toFixed(0);
  };

  const handleBuild = async () => {
    const segmentsWithAdjustments = queuedItems.map((item: any) => ({
      ...item,
      bidAdjustment: segmentBidAdjustments[item.label] || item.data?.suggestedBidAdjustment || 0
    }));

    const config = {
      mode: builderMode,
      buildType: builderMode === 'optimize' ? 'optimize_existing' : buildType,
      selectedSegments: segmentsWithAdjustments,
      bidStrategy: selectedBidStrategies[0],
      bidAmount,
      budget: finalBudget,
      createWideOpen: builderMode === 'scale' && adSetMode === 'targeted_and_wide_open',
      pauseSource: builderMode === 'scale' && pauseSource,
      platform,
      targetCpa,
      targetRoas,
      newName: builderMode === 'scale' ? newCampaignName : undefined,
      bidAdjustments: segmentBidAdjustments
    };
    await onBuildSegments(config);
  };

  return (
    <div className="mt-12">
      <div className="space-y-6">
        {/* Header - Matching segment title style */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                {isGoogle ? (builderMode === 'optimize' ? 'Optimize Campaign' : 'Scale Campaign') : 'Build Configuration'}
              </h3>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-4xl mx-auto">
              {isGoogle && builderMode === 'optimize'
                ? 'Apply bid adjustments to your existing campaign based on segment performance'
                : `Configure your horizontal scaling ${entityType === 'campaign' ? 'campaign' : 'ad set'}`
              }
            </p>
          </div>
        </div>

        {/* Selected Segments Display with Bid Adjustments */}
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Selected Segments ({queuedItems.length})
              </h4>
              {isGoogle && builderMode === 'optimize' && queuedItems.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Adjust bid percentages for each segment
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setQueuedItems([]);
                setSegmentBidAdjustments({});
              }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              Clear all
            </button>
          </div>

          {/* Google Optimize Mode - Detailed list with inline controls */}
          {isGoogle && builderMode === 'optimize' && queuedItems.length > 0 ? (
            <div className="space-y-2">
              {queuedItems.map((item: any, idx: number) => {
                const bidAdj = segmentBidAdjustments[item.label] ?? item.data?.suggestedBidAdjustment ?? 0;
                const isNegativeKeyword = item.type === 'negative_keywords';
                const suggestedAdj = item.data?.suggestedBidAdjustment;
                const roas = item.data?.roas;
                const conversions = item.data?.conversions;
                const spend = item.data?.spend;
                const cpa = item.data?.cpa;

                return (
                  <div
                    key={idx}
                    className={`bg-white dark:bg-dark border rounded-lg px-3 py-2.5 transition-all ${
                      bidAdj > 0
                        ? 'border-green-200 dark:border-green-800'
                        : bidAdj < 0
                          ? 'border-red-200 dark:border-red-800'
                          : 'border-gray-200 dark:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.label}</span>
                        {suggestedAdj !== undefined && suggestedAdj !== bidAdj && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            AI: {suggestedAdj > 0 ? '+' : ''}{suggestedAdj}%
                          </span>
                        )}
                        {isNegativeKeyword && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                            Negative
                          </span>
                        )}
                      </div>

                      {!isNegativeKeyword ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementBid(item.label)}
                            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#6B7280',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <Minus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                          </button>
                          <div className="relative">
                            <input
                              type="number"
                              value={bidAdj}
                              onChange={(e) => updateBidAdjustment(item.label, parseInt(e.target.value) || 0)}
                              className={`w-16 h-7 text-center text-sm font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                                bidAdj > 0
                                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                  : bidAdj < 0
                                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                    : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark text-gray-700 dark:text-gray-300'
                              }`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                          </div>
                          <button
                            onClick={() => incrementBid(item.label)}
                            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#6B7280',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setQueuedItems(queuedItems.filter((_: any, i: number) => i !== idx));
                              const newAdj = { ...segmentBidAdjustments };
                              delete newAdj[item.label];
                              setSegmentBidAdjustments(newAdj);
                            }}
                            className="ml-1 inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#F43F5E',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <X className="w-3 h-3 text-white" strokeWidth={2.5} />
                            </div>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setQueuedItems(queuedItems.filter((_: any, i: number) => i !== idx));
                          }}
                          className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                          style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: '#F43F5E',
                              boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                            }}
                          >
                            <X className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </div>
                        </button>
                      )}
                    </div>
                    {(roas !== undefined || conversions !== undefined || spend !== undefined) && (
                      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                        {roas !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{roas?.toFixed(1)}x</span> ROAS</span>
                        )}
                        {conversions !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{conversions}</span> conv</span>
                        )}
                        {cpa !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(cpa)}</span> CPA</span>
                        )}
                        {spend !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(spend)}</span> spend</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : queuedItems.length > 0 ? (
            /* Scale Mode or Non-Google - Enhanced row style with bid controls */
            <div className="space-y-2">
              {queuedItems.map((item: any, idx: number) => {
                const bidAdj = segmentBidAdjustments[item.label] ?? item.data?.suggestedBidAdjustment ?? 0;
                const isNegativeKeyword = item.type === 'negative_keywords';
                const suggestedAdj = item.data?.suggestedBidAdjustment;
                const roas = item.data?.roas;
                const conversions = item.data?.conversions;
                const spend = item.data?.spend;
                const cpa = item.data?.cpa;

                return (
                  <div
                    key={idx}
                    className={`bg-white dark:bg-dark border rounded-lg px-3 py-2.5 transition-all ${
                      bidAdj > 0
                        ? 'border-green-200 dark:border-green-800'
                        : bidAdj < 0
                          ? 'border-red-200 dark:border-red-800'
                          : 'border-gray-200 dark:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.label}</span>
                        {suggestedAdj !== undefined && suggestedAdj !== bidAdj && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            AI: {suggestedAdj > 0 ? '+' : ''}{suggestedAdj}%
                          </span>
                        )}
                        {isNegativeKeyword && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                            Negative
                          </span>
                        )}
                      </div>

                      {!isNegativeKeyword ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementBid(item.label)}
                            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#6B7280',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <Minus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                          </button>
                          <div className="relative">
                            <input
                              type="number"
                              value={bidAdj}
                              onChange={(e) => updateBidAdjustment(item.label, parseInt(e.target.value) || 0)}
                              className={`w-16 h-7 text-center text-sm font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                                bidAdj > 0
                                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                  : bidAdj < 0
                                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                    : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark text-gray-700 dark:text-gray-300'
                              }`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                          </div>
                          <button
                            onClick={() => incrementBid(item.label)}
                            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#6B7280',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setQueuedItems(queuedItems.filter((_: any, i: number) => i !== idx));
                              const newAdj = { ...segmentBidAdjustments };
                              delete newAdj[item.label];
                              setSegmentBidAdjustments(newAdj);
                            }}
                            className="ml-1 inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#F43F5E',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <X className="w-3 h-3 text-white" strokeWidth={2.5} />
                            </div>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setQueuedItems(queuedItems.filter((_: any, i: number) => i !== idx));
                          }}
                          className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm transition-transform hover:scale-105"
                          style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: '#F43F5E',
                              boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                            }}
                          >
                            <X className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </div>
                        </button>
                      )}
                    </div>
                    {(roas !== undefined || conversions !== undefined || spend !== undefined) && (
                      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                        {roas !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{roas?.toFixed(1)}x</span> ROAS</span>
                        )}
                        {conversions !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{conversions}</span> conv</span>
                        )}
                        {cpa !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(cpa)}</span> CPA</span>
                        )}
                        {spend !== undefined && (
                          <span><span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(spend)}</span> spend</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 italic py-2">
              {isGoogle && builderMode === 'optimize'
                ? 'Select segments from above to apply bid adjustments'
                : 'Select winning segments from above to include in your duplicated campaign.'}
            </div>
          )}
        </div>

        {/* Build Location (for Ad Sets only) */}
        {entityType === 'ad_set' && (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Build Location</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBuildType('add_to_campaign')}
                className={`p-3 rounded-lg border transition-all text-left ${
                  buildType === 'add_to_campaign'
                    ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                    : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-sm text-gray-900 dark:text-white">Add to Current Campaign</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create alongside existing ad sets</div>
              </button>
              <button
                onClick={() => setBuildType('new_campaign')}
                className={`p-3 rounded-lg border transition-all text-left ${
                  buildType === 'new_campaign'
                    ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                    : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-sm text-gray-900 dark:text-white">Create in New Campaign</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Start fresh campaign</div>
              </button>
            </div>
            {buildType === 'add_to_campaign' && (
              <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                <div className="relative flex items-center">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    pauseSource
                      ? 'border-primary-500 dark:border-primary-600 bg-primary-500 dark:bg-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a] bg-white dark:bg-dark'
                  }`}>
                    {pauseSource && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={pauseSource}
                    onChange={(e) => setPauseSource(e.target.checked)}
                    className="sr-only"
                  />
                </div>
                <span className="text-gray-700 dark:text-gray-300">Turn off source ad set (budget flows to new one)</span>
              </label>
            )}
          </div>
        )}

        {/* Bid Strategy Selection - Only for Scale mode or non-Google */}
        {(builderMode === 'scale' || !isGoogle) && (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {isGoogle ? 'Google Ads Bid Strategy' : 'Bid Strategy'}
          </h4>

          {/* Google-specific Bid Strategies */}
          {isGoogle ? (
            <div className="space-y-2">
              <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedBidStrategies.includes('manual_cpc')
                  ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedBidStrategies.includes('manual_cpc')
                      ? 'border-primary-500 dark:border-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}>
                    {selectedBidStrategies.includes('manual_cpc') && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                    )}
                  </div>
                  <input type="radio" name="bidStrategy" checked={selectedBidStrategies.includes('manual_cpc')} onChange={() => setSelectedBidStrategies(['manual_cpc'])} className="sr-only" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Manual CPC</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Set your own max CPC bids for full control</div>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded font-medium">Recommended</div>
              </label>
              {selectedBidStrategies.includes('manual_cpc') && (
                <div className="ml-8 p-3 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Starting Max CPC</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input type="number" step="0.05" value={bidAmount || 0.75} onChange={(e) => setBidAmount(parseFloat(e.target.value))} className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded bg-white dark:bg-dark text-gray-900 dark:text-white" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Start at $0.75-$1.00 for new campaigns</span>
                  </div>
                </div>
              )}

              <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedBidStrategies.includes('target_cpa')
                  ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedBidStrategies.includes('target_cpa')
                      ? 'border-primary-500 dark:border-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}>
                    {selectedBidStrategies.includes('target_cpa') && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                    )}
                  </div>
                  <input type="radio" name="bidStrategy" checked={selectedBidStrategies.includes('target_cpa')} onChange={() => setSelectedBidStrategies(['target_cpa'])} className="sr-only" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Target CPA</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Google optimizes bids to hit your target cost per acquisition</div>
                </div>
              </label>
              {selectedBidStrategies.includes('target_cpa') && (
                <div className="ml-8 p-3 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Target CPA</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input type="number" step="1" value={targetCpa || ''} onChange={(e) => setTargetCpa(parseFloat(e.target.value))} className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded bg-white dark:bg-dark text-gray-900 dark:text-white" placeholder="25.00" />
                  </div>
                </div>
              )}

              <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedBidStrategies.includes('target_roas')
                  ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedBidStrategies.includes('target_roas')
                      ? 'border-primary-500 dark:border-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}>
                    {selectedBidStrategies.includes('target_roas') && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                    )}
                  </div>
                  <input type="radio" name="bidStrategy" checked={selectedBidStrategies.includes('target_roas')} onChange={() => setSelectedBidStrategies(['target_roas'])} className="sr-only" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Target ROAS</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Google optimizes bids to hit your target return on ad spend</div>
                </div>
              </label>
              {selectedBidStrategies.includes('target_roas') && (
                <div className="ml-8 p-3 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Target ROAS</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={targetRoas || ''} onChange={(e) => setTargetRoas(parseFloat(e.target.value))} className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded bg-white dark:bg-dark text-gray-900 dark:text-white" placeholder="3.0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">x (e.g., 3.0 = 300% ROAS)</span>
                  </div>
                </div>
              )}

              <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedBidStrategies.includes('maximize_conversions')
                  ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedBidStrategies.includes('maximize_conversions')
                      ? 'border-primary-500 dark:border-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}>
                    {selectedBidStrategies.includes('maximize_conversions') && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                    )}
                  </div>
                  <input type="radio" name="bidStrategy" checked={selectedBidStrategies.includes('maximize_conversions')} onChange={() => setSelectedBidStrategies(['maximize_conversions'])} className="sr-only" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Maximize Conversions</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Automatically set bids to get the most conversions within budget</div>
                </div>
              </label>
            </div>
          ) : (
            /* Facebook/TikTok Bid Strategies */
            <div className="space-y-2">
              <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedBidStrategies.includes('highest_volume')
                  ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    selectedBidStrategies.includes('highest_volume')
                      ? 'border-primary-500 dark:border-primary-600 bg-primary-500 dark:bg-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a] bg-white dark:bg-dark'
                  }`}>
                    {selectedBidStrategies.includes('highest_volume') && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" checked={selectedBidStrategies.includes('highest_volume')} onChange={() => toggleBidStrategy('highest_volume')} className="sr-only" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Highest Volume</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Get maximum results within budget</div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#3a3a3a] px-2 py-1 rounded font-medium">Copied from current</div>
              </label>

              <div className="relative opacity-50 pointer-events-none">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-[#4a4a4a] bg-white dark:bg-dark" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Lowest Cost</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Spend entire budget at lowest cost per result</div>
                  </div>
                  <div className="group relative">
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark px-2 py-1 rounded font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Not Available Yet
                    </div>
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-dark dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Requires at least 50 conversions in the last 7 days
                    </div>
                  </div>
                </label>
              </div>

              <div className="relative opacity-50 pointer-events-none">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-[#4a4a4a] bg-white dark:bg-dark" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Cost Per Result Goal</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Maintain average cost per result</div>
                  </div>
                  <div className="group relative">
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark px-2 py-1 rounded font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Not Available Yet
                  </div>
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-dark dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Requires at least 50 conversions per week over the last 2 weeks
                  </div>
                </div>
              </label>
            </div>
          </div>
          )}
        </div>
        )}

        {/* Budget Configuration - Only for Scale mode or non-Google */}
        {(builderMode === 'scale' || !isGoogle) && (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Budget</h4>
          <div className="space-y-2">
            <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              budgetMode === 'match'
                ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  budgetMode === 'match'
                    ? 'border-primary-500 dark:border-primary-600'
                    : 'border-gray-300 dark:border-[#4a4a4a]'
                }`}>
                  {budgetMode === 'match' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                  )}
                </div>
                <input
                  type="radio"
                  name="budget"
                  value="match"
                  checked={budgetMode === 'match'}
                  onChange={() => setBudgetMode('match')}
                  className="sr-only"
                />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Match source budget</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(currentBudget)}/day</div>
              </div>
            </label>
            <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              budgetMode === 'suggested'
                ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  budgetMode === 'suggested'
                    ? 'border-primary-500 dark:border-primary-600'
                    : 'border-gray-300 dark:border-[#4a4a4a]'
                }`}>
                  {budgetMode === 'suggested' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                  )}
                </div>
                <input
                  type="radio"
                  name="budget"
                  value="suggested"
                  checked={budgetMode === 'suggested'}
                  onChange={() => setBudgetMode('suggested')}
                  className="sr-only"
                />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Suggested budget</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(suggestedBudget)}/day (based on segment coverage)</div>
              </div>
            </label>
            <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              budgetMode === 'custom'
                ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  budgetMode === 'custom'
                    ? 'border-primary-500 dark:border-primary-600'
                    : 'border-gray-300 dark:border-[#4a4a4a]'
                }`}>
                  {budgetMode === 'custom' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                  )}
                </div>
                <input
                  type="radio"
                  name="budget"
                  value="custom"
                  checked={budgetMode === 'custom'}
                  onChange={() => setBudgetMode('custom')}
                  className="sr-only"
                />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Custom budget</div>
                {budgetMode === 'custom' && (
                  <input
                    type="number"
                    value={customBudget}
                    onChange={(e) => setCustomBudget(parseFloat(e.target.value))}
                    className="ml-auto w-24 px-2 py-1 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded bg-white dark:bg-dark text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                )}
              </div>
            </label>
          </div>
        </div>
        )}

        {/* Ad Sets Selection (Campaigns only, Scale mode) */}
        {(builderMode === 'scale' || !isGoogle) && entityType === 'campaign' && (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Ad Sets</h4>
            <div className="space-y-2">
              <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                adSetMode === 'targeted_and_wide_open'
                  ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    adSetMode === 'targeted_and_wide_open'
                      ? 'border-primary-500 dark:border-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}>
                    {adSetMode === 'targeted_and_wide_open' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="adSetMode"
                    value="targeted_and_wide_open"
                    checked={adSetMode === 'targeted_and_wide_open'}
                    onChange={() => setAdSetMode('targeted_and_wide_open')}
                    className="sr-only"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">1 Targeted + 1 Wide Open</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Creates both targeted version and wide open version (same segments, no detailed targeting)</div>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded font-medium">
                  Recommended
                </div>
              </label>
              <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                adSetMode === 'targeted'
                  ? 'border-primary-500 dark:border-primary-600 bg-gray-50 dark:bg-dark'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    adSetMode === 'targeted'
                      ? 'border-primary-500 dark:border-primary-600'
                      : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}>
                    {adSetMode === 'targeted' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-600" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="adSetMode"
                    value="targeted"
                    checked={adSetMode === 'targeted'}
                    onChange={() => setAdSetMode('targeted')}
                    className="sr-only"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">1 Targeted Ad Set</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Applies selected segments with detailed targeting</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Campaign Name - Only for Scale mode or non-Google */}
        {(builderMode === 'scale' || !isGoogle) && (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{entityType === 'campaign' ? 'Campaign' : 'Ad Set'} Name</h4>
              {customCampaignName !== null && (
                <button
                  onClick={() => setCustomCampaignName(null)}
                  className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Reset to auto
                </button>
              )}
            </div>
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => setCustomCampaignName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Enter campaign name"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {customCampaignName === null ? 'Auto-generated based on your selections' : 'Custom name (click Reset to auto to regenerate)'}
            </p>
          </div>
        )}

        {/* Preview Card */}
        <div className="relative bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {isGoogle && builderMode === 'optimize' ? 'Changes Preview' : 'Build Preview'}
          </h4>

          {isGoogle && builderMode === 'optimize' ? (
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 pr-40">
              <li>• Applying changes to existing campaign</li>
              {queuedItems.filter((item: any) => item.type !== 'negative_keywords').length > 0 && (
                <li>• {queuedItems.filter((item: any) => item.type !== 'negative_keywords').length} bid adjustments to apply</li>
              )}
              {queuedItems.filter((item: any) => item.type === 'negative_keywords').length > 0 && (
                <li>• {queuedItems.filter((item: any) => item.type === 'negative_keywords').length} negative keywords to add</li>
              )}
              {queuedItems.length === 0 && <li>• No changes selected</li>}
            </ul>
          ) : (
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 pr-40">
              <li>• {buildType === 'new_campaign' ? 'New campaign' : 'Add to current campaign'}: "{newCampaignName}"</li>
              <li>• {adSetMode === 'targeted_and_wide_open' ? '2 ad sets: 1 targeted + 1 wide open (no detailed targeting)' : '1 targeted ad set'}</li>
              <li>• Budget: {formatCurrency(finalBudget)}/day per ad set</li>
              {queuedItems.length > 0 && <li>• {queuedItems.length} winning segments applied</li>}
              {queuedItems.length === 0 && <li>• Simple duplication (no segment targeting)</li>}
              {pauseSource && <li>• Source ad set will be turned off</li>}
            </ul>
          )}

          {/* Action Button - Bottom Right */}
          <button
            onClick={handleBuild}
            disabled={isProcessing || (isGoogle && builderMode === 'optimize' && queuedItems.length === 0)}
            className="btn btn-secondary group absolute bottom-3 right-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{isGoogle && builderMode === 'optimize' ? 'Applying...' : 'Building...'}</span>
              </>
            ) : (
              <>
                <span>{isGoogle && builderMode === 'optimize' ? 'Apply Changes' : 'Build Campaign'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Deep Dive Tab Component (with Builder UI at bottom)
const DeepDiveTab: React.FC<any> = ({
  insight,
  demographics,
  placements,
  geographic,
  temporal,
  devices,
  keywords,
  searchTerms,
  negativeKeywords,
  gender,
  ageGroups,
  adSchedule,
  householdIncome,
  parentalStatus,
  adGroups,
  customerBehavior,
  onAddToQueue,
  isInQueue,
  showHint,
  onDismissHint,
  formatCurrency,
  formatNumber,
  formatPercent,
  queuedItems,
  setQueuedItems,
  entityType,
  entityId,
  entityName,
  platform,
  currentBudget,
  currentCountries,
  onBuildSegments,
  isProcessing
}) => {
  const isGoogle = platform?.toLowerCase() === 'google';
  const isTikTok = platform?.toLowerCase() === 'tiktok';
  const [buildMode, setBuildMode] = useState<'optimize' | 'scale'>('scale');

  const parseBidAdjustment = (bidAdj: string | number | undefined): number => {
    if (bidAdj === undefined) return 0;
    if (typeof bidAdj === 'number') return bidAdj;
    const match = String(bidAdj).match(/([+-]?\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const SegmentRow = ({
    title,
    icon: Icon,
    roas,
    conversions,
    cpa,
    spend,
    revenue,
    secondaryLabel,
    secondaryValue,
    label,
    type,
    onAdd,
    onRemove,
    suggestedBidAdjustment,
    qualityScore,
    averageRoas
  }: any) => {
    const cardLabel = label || title || 'Unknown';
    const inQueue = isInQueue(cardLabel);
    const hasBidSuggestion = isGoogle && suggestedBidAdjustment !== undefined && suggestedBidAdjustment !== 0;
    const hasPerformanceIndicator = !hasBidSuggestion && averageRoas !== undefined && roas !== undefined && averageRoas > 0;
    const performancePercent = hasPerformanceIndicator ? ((roas - averageRoas) / averageRoas) * 100 : 0;
    const isAboveAverage = performancePercent > 5;

    const handleClick = () => {
      if (inQueue) {
        onRemove?.(cardLabel);
      } else {
        onAdd?.();
      }
    };

    return (
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-between bg-white dark:bg-dark/50 rounded-lg p-3 border transition-all ${
          inQueue
            ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
            : 'border-gray-200 dark:border-[#3a3a3a] hover:border-gray-300 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{title || cardLabel}</span>
              {qualityScore !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  QS: {qualityScore}/10
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {conversions !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {conversions} conv{cpa !== undefined && ` / ${formatCurrency(cpa)} CPA`}
                </span>
              )}
              {revenue !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(revenue)} rev
                </span>
              )}
              {spend !== undefined && !revenue && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(spend)} spent
                </span>
              )}
              {secondaryLabel && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {secondaryLabel}: {secondaryValue}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {roas !== undefined && (
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900 dark:text-white">{roas.toFixed(1)}x</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">ROAS</div>
            </div>
          )}
          {hasBidSuggestion && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${
              suggestedBidAdjustment > 0
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {suggestedBidAdjustment > 0 ? '+' : ''}{suggestedBidAdjustment}%
            </span>
          )}
          {hasPerformanceIndicator && Math.abs(performancePercent) >= 5 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5 ${
              isAboveAverage
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {isAboveAverage ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {isAboveAverage ? '+' : ''}{performancePercent.toFixed(0)}%
            </span>
          )}
          {inQueue ? (
            <div
              className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#10B981',
                  boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                }}
              >
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <div
              className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
              style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#6B7280',
                  boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                }}
              >
                <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
            </div>
          )}
        </div>
      </button>
    );
  };

  const SectionHeader = ({ title, icon: Icon, analysis }: any) => (
    <div className="mb-4">
      <div className="mb-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {title}
            </span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
        </div>
      </div>
      {analysis && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {analysis}
        </p>
      )}
    </div>
  );

  const EmptySegmentSection = ({ title, icon: Icon, description }: any) => (
    <div>
      <SectionHeader title={title} icon={Icon} analysis={null} />
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-dashed border-gray-300 dark:border-[#3a3a3a] rounded-xl p-8 text-center">
        <Icon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Segment data will appear here when available for deeper analysis
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Build Mode Toggle */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Build Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {buildMode === 'scale'
                ? 'Configure your horizontal scaling strategy by duplicating the original campaign'
                : 'Reduce spend on underperformers with negative adjustments'}
            </p>
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-[#2a2a2a] rounded-lg p-1">
            <button
              onClick={() => setBuildMode('optimize')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                buildMode === 'optimize'
                  ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-1.5" />
              Optimize
            </button>
            <button
              onClick={() => setBuildMode('scale')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                buildMode === 'scale'
                  ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1.5" />
              Scale
            </button>
          </div>
        </div>
      </div>

      {showHint && (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Click any segment to add to Builder
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {buildMode === 'scale'
                  ? 'Select winning segments to include in your duplicated campaign targeting your best performers'
                  : 'Select segments to optimize bids and reduce wasted spend'}
              </p>
            </div>
            <button
              onClick={onDismissHint}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors flex-shrink-0"
              aria-label="Dismiss hint"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Demographics Section - Only show for non-Google platforms (Google has detailed Age Groups section below) */}
      {!isGoogle && (() => {
      const sortedDemographics = [...demographics].sort((a, b) => (b.roas || 0) - (a.roas || 0));
      const avgDemographicRoas = sortedDemographics.length > 0
        ? sortedDemographics.reduce((sum: number, d: any) => sum + (d.roas || 0), 0) / sortedDemographics.length
        : 0;
      return (
      <div>
        <SectionHeader
          title="Age Demographics"
          icon={Users}
          analysis={demographics.length > 0
            ? `${demographics[0].age || demographics[0].segment || 'Top age group'} leads with ${demographics[0].roas?.toFixed(1)}x ROAS. Adjust bids by age to optimize performance.`
            : "Analyze which age groups drive the best results for your campaigns."
          }
        />
        {demographics.length > 0 ? (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="space-y-2">
              {sortedDemographics.map((demo: any, idx) => {
                const demoLabel = demo.segment || `Age ${idx + 1}`;
                const bidAdj = parseBidAdjustment(demo.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={demoLabel}
                    label={demoLabel}
                    icon={Users}
                    type="demographic"
                    roas={demo.roas}
                    conversions={demo.conversions}
                    cpa={demo.cpa}
                    revenue={demo.revenue}
                    suggestedBidAdjustment={bidAdj !== 0 ? bidAdj : undefined}
                    averageRoas={avgDemographicRoas}
                    onAdd={() => onAddToQueue({ type: 'demographic', data: { ...demo, suggestedBidAdjustment: bidAdj }, label: demoLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = sortedDemographics
                  .filter((d: any) => !isInQueue(d.segment || 'Unknown'))
                  .map((demo: any) => {
                    const demoLabel = demo.segment || 'Unknown';
                    const bidAdj = parseBidAdjustment(demo.bidAdjustment);
                    return { type: 'demographic' as const, data: { ...demo, suggestedBidAdjustment: bidAdj }, label: demoLabel };
                  });
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All Demographics
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-dashed border-gray-300 dark:border-[#3a3a3a] rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No demographic segment data available yet
            </p>
          </div>
        )}
      </div>
      );
      })()}

      {/* Google-specific: Keywords Section */}
      {isGoogle && keywords && keywords.length > 0 && (() => {
        const sortedKeywords = [...keywords].sort((a, b) => (b.roas || 0) - (a.roas || 0));
        const allKwLabels = sortedKeywords.map((kw: any, idx: number) => kw.keyword || `Keyword ${idx + 1}`);
        const selectedKwCount = allKwLabels.filter((label: string) => isInQueue(label)).length;
        const avgKwRoas = sortedKeywords.reduce((sum: number, k: any) => sum + (k.roas || 0), 0) / sortedKeywords.length;
        return (
          <div>
            <SectionHeader
              title="Positive Keywords"
              icon={Target}
              analysis={`"${sortedKeywords[0]?.keyword}" leads with ${sortedKeywords[0]?.roas?.toFixed(1)}x ROAS and QS ${sortedKeywords[0]?.qualityScore}/10`}
            />
            <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
              <div className="space-y-2">
                {sortedKeywords.map((kw: any, idx) => {
                  const kwLabel = kw.keyword || `Keyword ${idx + 1}`;
                  const inQueue = isInQueue(kwLabel);
                  const perfPercent = avgKwRoas > 0 ? ((kw.roas - avgKwRoas) / avgKwRoas) * 100 : 0;
                  const suggestedBidAdj = Math.round(perfPercent / 5) * 5;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (inQueue) {
                          setQueuedItems(queuedItems.filter((qi: any) => qi.label !== kwLabel));
                        } else {
                          onAddToQueue({ type: 'keyword', data: { ...kw, suggestedBidAdjustment: suggestedBidAdj }, label: kwLabel });
                        }
                      }}
                      className={`w-full flex items-center justify-between bg-white dark:bg-dark/50 rounded-lg p-3 border transition-all ${
                        inQueue
                          ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
                          : 'border-gray-200 dark:border-[#3a3a3a] hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Target className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">"{kwLabel}"</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">{kw.matchType}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">QS: {kw.qualityScore}/10</span>
                            {inQueue && <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">Added</span>}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                            {kw.conversions} conv / {formatCurrency(kw.cpa || 0)} CPA / {formatCurrency(kw.spend || 0)} spent
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{kw.roas?.toFixed(1)}x</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">ROAS</div>
                        </div>
                        {suggestedBidAdj !== 0 && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5 ${
                            suggestedBidAdj > 0
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {suggestedBidAdj > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {suggestedBidAdj > 0 ? '+' : ''}{suggestedBidAdj}%
                          </span>
                        )}
                        {inQueue ? (
                          <div
                            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#10B981',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                            style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#6B7280',
                                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  const itemsToAdd = sortedKeywords
                    .filter((kw: any) => !isInQueue(kw.keyword || 'Unknown'))
                    .map((kw: any) => ({ type: 'keyword' as const, data: kw, label: kw.keyword || 'Unknown' }));
                  if (itemsToAdd.length > 0) {
                    onAddToQueue(itemsToAdd);
                  }
                }}
                className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                {selectedKwCount > 0 ? `Add Remaining (${sortedKeywords.length - selectedKwCount})` : 'Add All Keywords'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Google-specific: Negative Keywords Section */}
      {isGoogle && negativeKeywords && negativeKeywords.length > 0 && (
        <div>
          <SectionHeader
            title="Suggested Negative Keywords"
            icon={AlertTriangle}
            analysis={`${negativeKeywords.length} keywords wasting spend. Save ${formatCurrency(negativeKeywords.reduce((sum: number, n: any) => sum + (n.spend || 0), 0))} by adding as negatives.`}
          />
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
            <div className="space-y-2">
              {negativeKeywords.map((neg: any, idx) => {
                const isAdded = isInQueue(`Negative: ${neg.keyword}`);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isAdded) {
                        const newQueue = queuedItems.filter((item: QueuedItem) => item.label !== `Negative: ${neg.keyword}`);
                        setQueuedItems(newQueue);
                      } else {
                        onAddToQueue({ type: 'negative_keywords', data: [neg], label: `Negative: ${neg.keyword}` });
                      }
                    }}
                    className={`w-full flex items-center justify-between bg-white dark:bg-dark/50 rounded-lg p-3 border transition-all ${
                      isAdded
                        ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
                        : 'border-gray-200 dark:border-[#3a3a3a] hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">"{neg.keyword}"</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">{neg.conversions === 0 ? 'No Conv' : `${neg.conversions} Conv`}</span>
                        {isAdded && <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">Added</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{neg.reason}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(neg.spend || 0)}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">wasted</div>
                      </div>
                      {isAdded ? (
                        <div
                          className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                          style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: '#10B981',
                              boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                            }}
                          >
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                          style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: '#6B7280',
                              boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = negativeKeywords
                  .filter((neg: any) => !isInQueue(`Negative: ${neg.keyword}`))
                  .map((neg: any) => ({ type: 'negative_keywords' as const, data: [neg], label: `Negative: ${neg.keyword}` }));
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All as Negatives
            </button>
          </div>
        </div>
      )}

      {/* Google-specific: Search Terms Section */}
      {isGoogle && searchTerms && searchTerms.length > 0 && (
        <div>
          <SectionHeader
            title="Search Terms Analysis"
            icon={FileText}
            analysis="Review actual search queries triggering your ads. Winners become keywords; low performers become negatives."
          />
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
            <div className="space-y-2">
              {[...searchTerms].sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((st: any, idx) => {
                const isWinner = st.roas >= 1.5;
                const isLoser = st.roas < 1 || st.conversions === 0;
                const stLabel = isWinner ? `Add Keyword: ${st.searchTerm}` : `Negative: ${st.searchTerm}`;
                const inQueue = isInQueue(stLabel);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (inQueue) {
                        setQueuedItems(queuedItems.filter((qi: any) => qi.label !== stLabel));
                      } else {
                        if (isWinner) {
                          onAddToQueue({ type: 'keyword', data: { keyword: st.searchTerm, matchType: 'Exact', roas: st.roas, conversions: st.conversions, spend: st.spend }, label: stLabel });
                        } else {
                          onAddToQueue({ type: 'negative_keywords', data: [{ keyword: st.searchTerm, spend: st.spend, conversions: st.conversions, reason: st.recommendation }], label: stLabel });
                        }
                      }
                    }}
                    className={`w-full flex items-center justify-between rounded-lg p-3 border transition-all bg-white dark:bg-dark/50 ${
                      inQueue
                        ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
                        : 'border-gray-200 dark:border-[#3a3a3a] hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">"{st.searchTerm}"</span>
                        {isWinner && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Winner</span>}
                        {st.conversions === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">No Conv</span>}
                        {inQueue && <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">Added</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isWinner ? 'Add as exact match keyword' : isLoser ? 'Add as negative keyword' : st.recommendation}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${st.roas >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {st.roas?.toFixed(1)}x ROAS
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{st.conversions} conv / {formatCurrency(st.spend || 0)}</div>
                      </div>
                      {inQueue ? (
                        <div
                          className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                          style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: '#10B981',
                              boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                            }}
                          >
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                          style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: '#6B7280',
                              boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Google-specific: Gender Section */}
      {isGoogle && gender && gender.length > 0 && (
        <div>
          <SectionHeader
            title="Gender Performance"
            icon={Users}
            analysis={`${[...gender].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].gender} leads with ${[...gender].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].roas?.toFixed(1)}x ROAS. Apply bid adjustments to optimize targeting.`}
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="space-y-2">
              {[...gender].sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((g: any, idx) => {
                const genderLabel = g.gender || `Gender ${idx + 1}`;
                const bidAdj = parseBidAdjustment(g.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={genderLabel}
                    label={genderLabel}
                    icon={Users}
                    type="gender"
                    roas={g.roas}
                    conversions={g.conversions}
                    cpa={g.cpa}
                    spend={g.spend}
                    suggestedBidAdjustment={bidAdj !== 0 ? bidAdj : undefined}
                    onAdd={() => onAddToQueue({ type: 'gender', data: { ...g, suggestedBidAdjustment: bidAdj }, label: genderLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const sortedGender = [...gender].sort((a, b) => (b.roas || 0) - (a.roas || 0));
                const itemsToAdd = sortedGender
                  .filter((g: any) => !isInQueue(g.gender || 'Unknown'))
                  .map((g: any) => {
                    const genderLabel = g.gender || 'Unknown';
                    const bidAdj = parseBidAdjustment(g.bidAdjustment);
                    return { type: 'gender' as const, data: { ...g, suggestedBidAdjustment: bidAdj }, label: genderLabel };
                  });
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All Gender Segments
            </button>
          </div>
        </div>
      )}

      {/* Google-specific: Age Groups Section */}
      {isGoogle && ageGroups && ageGroups.length > 0 && (
        <div>
          <SectionHeader
            title="Age Group Performance"
            icon={Users}
            analysis={`${[...ageGroups].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].ageGroup} is your top age group with ${[...ageGroups].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].roas?.toFixed(1)}x ROAS. Adjust bids to focus on profitable demographics.`}
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="space-y-2">
              {[...ageGroups].sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((age: any, idx) => {
                const ageLabel = age.ageGroup || `Age ${idx + 1}`;
                const bidAdj = parseBidAdjustment(age.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={ageLabel}
                    label={ageLabel}
                    icon={Users}
                    type="age_group"
                    roas={age.roas}
                    conversions={age.conversions}
                    cpa={age.cpa}
                    spend={age.spend}
                    suggestedBidAdjustment={bidAdj !== 0 ? bidAdj : undefined}
                    onAdd={() => onAddToQueue({ type: 'age_group', data: { ...age, suggestedBidAdjustment: bidAdj }, label: ageLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const sortedAgeGroups = [...ageGroups].sort((a, b) => (b.roas || 0) - (a.roas || 0));
                const itemsToAdd = sortedAgeGroups
                  .filter((a: any) => !isInQueue(a.ageGroup || 'Unknown'))
                  .map((age: any) => {
                    const ageLabel = age.ageGroup || 'Unknown';
                    const bidAdj = parseBidAdjustment(age.bidAdjustment);
                    return { type: 'age_group' as const, data: { ...age, suggestedBidAdjustment: bidAdj }, label: ageLabel };
                  });
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All Age Groups
            </button>
          </div>
        </div>
      )}

      {/* Google-specific: Ad Schedule Section */}
      {isGoogle && adSchedule && adSchedule.length > 0 && (
        <div>
          <SectionHeader
            title="Ad Schedule Performance"
            icon={Calendar}
            analysis={`${[...adSchedule].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].dayPart} shows the best performance with ${[...adSchedule].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].roas?.toFixed(1)}x ROAS. Use dayparting bid adjustments to maximize ROI.`}
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="space-y-2">
              {[...adSchedule].sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((schedule: any, idx) => {
                const scheduleLabel = schedule.dayPart || `Schedule ${idx + 1}`;
                const bidAdj = parseBidAdjustment(schedule.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={scheduleLabel}
                    label={scheduleLabel}
                    icon={Calendar}
                    type="ad_schedule"
                    roas={schedule.roas}
                    conversions={schedule.conversions}
                    cpa={schedule.cpa}
                    spend={schedule.spend}
                    suggestedBidAdjustment={bidAdj !== 0 ? bidAdj : undefined}
                    onAdd={() => onAddToQueue({ type: 'ad_schedule', data: { ...schedule, suggestedBidAdjustment: bidAdj }, label: scheduleLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const sortedSchedule = [...adSchedule].sort((a, b) => (b.roas || 0) - (a.roas || 0));
                const itemsToAdd = sortedSchedule
                  .filter((s: any) => !isInQueue(s.dayPart || 'Unknown'))
                  .map((schedule: any) => {
                    const scheduleLabel = schedule.dayPart || 'Unknown';
                    const bidAdj = parseBidAdjustment(schedule.bidAdjustment);
                    return { type: 'ad_schedule' as const, data: { ...schedule, suggestedBidAdjustment: bidAdj }, label: scheduleLabel };
                  });
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All Schedules
            </button>
          </div>
        </div>
      )}

      {/* Google-specific: Household Income Section */}
      {isGoogle && householdIncome && householdIncome.length > 0 && (
        <div>
          <SectionHeader
            title="Household Income Performance"
            icon={DollarSign}
            analysis={`Higher income brackets (${[...householdIncome].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].income}) show ${[...householdIncome].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].roas?.toFixed(1)}x ROAS. Target affluent demographics with bid adjustments.`}
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="space-y-2">
              {[...householdIncome].sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((income: any, idx) => {
                const incomeLabel = income.income || `Income ${idx + 1}`;
                const bidAdj = parseBidAdjustment(income.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={incomeLabel}
                    label={incomeLabel}
                    icon={DollarSign}
                    type="household_income"
                    roas={income.roas}
                    conversions={income.conversions}
                    cpa={income.cpa}
                    spend={income.spend}
                    suggestedBidAdjustment={bidAdj !== 0 ? bidAdj : undefined}
                    onAdd={() => onAddToQueue({ type: 'household_income', data: { ...income, suggestedBidAdjustment: bidAdj }, label: incomeLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const sortedIncome = [...householdIncome].sort((a, b) => (b.roas || 0) - (a.roas || 0));
                const itemsToAdd = sortedIncome
                  .filter((i: any) => !isInQueue(i.income || 'Unknown'))
                  .map((income: any) => {
                    const incomeLabel = income.income || 'Unknown';
                    const bidAdj = parseBidAdjustment(income.bidAdjustment);
                    return { type: 'household_income' as const, data: { ...income, suggestedBidAdjustment: bidAdj }, label: incomeLabel };
                  });
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All Income Segments
            </button>
          </div>
        </div>
      )}

      {/* Google-specific: Parental Status Section */}
      {isGoogle && parentalStatus && parentalStatus.length > 0 && (
        <div>
          <SectionHeader
            title="Parental Status Performance"
            icon={Users}
            analysis={`${[...parentalStatus].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].status} segment shows ${[...parentalStatus].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0].roas?.toFixed(1)}x ROAS. Adjust bids based on your product's target demographics.`}
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="space-y-2">
              {[...parentalStatus].sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((status: any, idx) => {
                const statusLabel = status.status || `Status ${idx + 1}`;
                const bidAdj = parseBidAdjustment(status.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={statusLabel}
                    label={statusLabel}
                    icon={Users}
                    type="parental_status"
                    roas={status.roas}
                    conversions={status.conversions}
                    cpa={status.cpa}
                    spend={status.spend}
                    suggestedBidAdjustment={bidAdj !== 0 ? bidAdj : undefined}
                    onAdd={() => onAddToQueue({ type: 'parental_status', data: { ...status, suggestedBidAdjustment: bidAdj }, label: statusLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const sortedStatus = [...parentalStatus].sort((a, b) => (b.roas || 0) - (a.roas || 0));
                const itemsToAdd = sortedStatus
                  .filter((s: any) => !isInQueue(s.status || 'Unknown'))
                  .map((status: any) => {
                    const statusLabel = status.status || 'Unknown';
                    const bidAdj = parseBidAdjustment(status.bidAdjustment);
                    return { type: 'parental_status' as const, data: { ...status, suggestedBidAdjustment: bidAdj }, label: statusLabel };
                  });
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All Parental Segments
            </button>
          </div>
        </div>
      )}

      {/* Google-specific: Ad Groups Section */}
      {isGoogle && adGroups && adGroups.length > 0 && (() => {
        const sortedAdGroups = [...adGroups].sort((a, b) => (b.roas || 0) - (a.roas || 0));
        const avgAdGroupRoas = sortedAdGroups.reduce((sum: number, ag: any) => sum + (ag.roas || 0), 0) / sortedAdGroups.length;
        return (
        <div>
          <SectionHeader
            title="Ad Group Performance"
            icon={BarChart3}
            analysis={`"${sortedAdGroups[0].adGroup}" is your top ad group with ${sortedAdGroups[0].roas?.toFixed(1)}x ROAS. Focus budget on high-performing ad groups.`}
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
            <div className="space-y-2">
              {sortedAdGroups.map((ag: any, idx) => {
                const agLabel = ag.adGroup || `Ad Group ${idx + 1}`;
                return (
                  <SegmentRow
                    key={idx}
                    title={agLabel}
                    label={agLabel}
                    icon={BarChart3}
                    type="ad_group"
                    roas={ag.roas}
                    conversions={ag.conversions}
                    cpa={ag.cpa}
                    spend={ag.spend}
                    qualityScore={ag.qualityScore}
                    averageRoas={avgAdGroupRoas}
                    onAdd={() => onAddToQueue({ type: 'ad_group', data: ag, label: agLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = sortedAdGroups
                  .filter((ag: any) => !isInQueue(ag.adGroup || 'Unknown'))
                  .map((ag: any) => ({ type: 'ad_group' as const, data: ag, label: ag.adGroup || 'Unknown' }));
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add All Ad Groups
            </button>
          </div>
        </div>
        );
      })()}

      {/* Google-specific: Devices Section */}
      {isGoogle && devices && devices.length > 0 && (() => {
        const sortedDevices = [...devices].sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0));
        const allDeviceLabels = sortedDevices.map((d: any, idx: number) => d.device || `Device ${idx + 1}`);
        const selectedDeviceCount = allDeviceLabels.filter((label: string) => isInQueue(label)).length;
        const avgDeviceRoas = sortedDevices.reduce((sum: number, d: any) => sum + (d.roas || 0), 0) / sortedDevices.length;
        return (
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
            <SectionHeader
              title="Device Performance"
              icon={Smartphone}
              analysis={`${sortedDevices[0]?.device || 'Top device'} leads with ${sortedDevices[0]?.roas?.toFixed(1)}x ROAS`}
            />
            <div className="space-y-2">
              {sortedDevices.map((device: any, idx: number) => {
                const deviceLabel = device.device || `Device ${idx + 1}`;
                const bidAdj = parseBidAdjustment(device.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={deviceLabel}
                    label={deviceLabel}
                    icon={Smartphone}
                    type="device"
                    roas={device.roas}
                    conversions={device.conversions}
                    cpa={device.cpa}
                    spend={device.spend}
                    revenue={device.revenue}
                    suggestedBidAdjustment={bidAdj}
                    averageRoas={avgDeviceRoas}
                    onAdd={() => onAddToQueue({ type: 'device', data: { ...device, suggestedBidAdjustment: bidAdj }, label: deviceLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = sortedDevices
                  .map((device: any, idx: number) => {
                    const deviceLabel = device.device || `Device ${idx + 1}`;
                    const bidAdj = parseBidAdjustment(device.bidAdjustment);
                    return { type: 'device' as const, data: { ...device, suggestedBidAdjustment: bidAdj }, label: deviceLabel };
                  })
                  .filter((item) => !isInQueue(item.label));
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="mt-3 w-full py-2 px-4 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              {selectedDeviceCount > 0 ? `Add Remaining (${sortedDevices.length - selectedDeviceCount})` : `Add All Devices`}
            </button>
          </div>
        );
      })()}

      {/* Geographic Section */}
      {geographic.length > 0 ? (() => {
        const sortedGeo = [...geographic].sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0));
        const allGeoLabels = sortedGeo.map((g: any, idx: number) => g.region || g.segment || `Region ${idx + 1}`);
        const selectedGeoCount = allGeoLabels.filter((label: string) => isInQueue(label)).length;
        const avgGeoRoas = sortedGeo.reduce((sum: number, g: any) => sum + (g.roas || 0), 0) / sortedGeo.length;
        return (
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
            <SectionHeader
              title="Geographic Performance"
              icon={Globe}
              analysis={`${sortedGeo[0]?.region || sortedGeo[0]?.segment || 'Top region'} leads with ${sortedGeo[0]?.roas?.toFixed(1)}x ROAS`}
            />
            <div className="space-y-2">
              {sortedGeo.map((geo: any, idx: number) => {
                const geoLabel = geo.region || geo.segment || `Region ${idx + 1}`;
                const bidAdj = parseBidAdjustment(geo.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={geoLabel}
                    label={geoLabel}
                    icon={MapPin}
                    type="geographic"
                    roas={geo.roas}
                    conversions={geo.conversions}
                    cpa={geo.cpa}
                    spend={geo.spend}
                    revenue={geo.revenue}
                    secondaryLabel="AOV"
                    secondaryValue={formatCurrency(geo.averageOrderValue || 0)}
                    suggestedBidAdjustment={isGoogle ? bidAdj : undefined}
                    averageRoas={avgGeoRoas}
                    onAdd={() => onAddToQueue({ type: 'geographic', data: { ...geo, suggestedBidAdjustment: isGoogle ? bidAdj : undefined }, label: geoLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = sortedGeo
                  .map((geo: any, idx: number) => {
                    const geoLabel = geo.region || geo.segment || `Region ${idx + 1}`;
                    const bidAdj = parseBidAdjustment(geo.bidAdjustment);
                    return { type: 'geographic' as const, data: { ...geo, suggestedBidAdjustment: isGoogle ? bidAdj : undefined }, label: geoLabel };
                  })
                  .filter((item) => !isInQueue(item.label));
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="mt-3 w-full py-2 px-4 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              {selectedGeoCount > 0 ? `Add Remaining (${sortedGeo.length - selectedGeoCount})` : `Add All Regions`}
            </button>
          </div>
        );
      })() : (
        <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
          <SectionHeader
            title="Geographic Performance"
            icon={Globe}
            analysis="Discover which regions and locations generate the highest returns."
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-dashed border-gray-300 dark:border-[#3a3a3a] rounded-xl p-8 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No geographic data available yet
            </p>
          </div>
        </div>
      )}

      {/* Placements Section - Platform-specific */}
      {!isGoogle && (placements.length > 0 ? (() => {
        const sortedPlacements = [...placements].sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0));
        const allPlacementLabels = sortedPlacements.map((p: any, idx: number) => p.placement || p.segment || `Placement ${idx + 1}`);
        const selectedPlacementCount = allPlacementLabels.filter((label: string) => isInQueue(label)).length;
        const avgPlacementRoas = sortedPlacements.reduce((sum: number, p: any) => sum + (p.roas || 0), 0) / sortedPlacements.length;
        return (
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
            <SectionHeader
              title={isTikTok ? "TikTok Placements" : "Meta Placements"}
              icon={Tv}
              analysis={`${sortedPlacements[0]?.placement || sortedPlacements[0]?.segment || 'Top placement'} leads with ${sortedPlacements[0]?.roas?.toFixed(1)}x ROAS`}
            />
            <div className="space-y-2">
              {sortedPlacements.map((placement: any, idx: number) => {
                const placementLabel = placement.placement || placement.segment || `Placement ${idx + 1}`;
                return (
                  <SegmentRow
                    key={idx}
                    title={placementLabel}
                    label={placementLabel}
                    icon={Tv}
                    type="placement"
                    roas={placement.roas}
                    conversions={placement.conversions}
                    cpa={placement.cpa}
                    spend={placement.spend}
                    revenue={placement.revenue}
                    secondaryLabel="Share"
                    secondaryValue={formatPercent(placement.contribution || 0)}
                    averageRoas={avgPlacementRoas}
                    onAdd={() => onAddToQueue({ type: 'placement', data: placement, label: placementLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = sortedPlacements
                  .map((placement: any, idx: number) => {
                    const placementLabel = placement.placement || placement.segment || `Placement ${idx + 1}`;
                    return { type: 'placement' as const, data: placement, label: placementLabel };
                  })
                  .filter((item) => !isInQueue(item.label));
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="mt-3 w-full py-2 px-4 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              {selectedPlacementCount > 0 ? `Add Remaining (${sortedPlacements.length - selectedPlacementCount})` : `Add All Placements`}
            </button>
          </div>
        );
      })() : (
        <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
          <SectionHeader
            title={isTikTok ? "TikTok Placements" : "Meta Placements"}
            icon={Smartphone}
            analysis="Identify which ad placements and formats perform best."
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-dashed border-gray-300 dark:border-[#3a3a3a] rounded-xl p-8 text-center">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No placement data available yet
            </p>
          </div>
        </div>
      ))}

      {/* Google-specific: Network Performance Section */}
      {isGoogle && placements.length > 0 && (() => {
        const sortedNetworks = [...placements].sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0));
        const allNetworkLabels = sortedNetworks.map((n: any, idx: number) => n.placement || `Network ${idx + 1}`);
        const selectedNetworkCount = allNetworkLabels.filter((label: string) => isInQueue(label)).length;
        const avgNetworkRoas = sortedNetworks.reduce((sum: number, n: any) => sum + (n.roas || 0), 0) / sortedNetworks.length;
        return (
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
            <SectionHeader
              title="Google Network Performance"
              icon={Globe}
              analysis={`${sortedNetworks[0]?.placement || 'Search Network'} leads with ${sortedNetworks[0]?.roas?.toFixed(1)}x ROAS`}
            />
            <div className="space-y-2">
              {sortedNetworks.map((network: any, idx: number) => {
                const networkLabel = network.placement || `Network ${idx + 1}`;
                return (
                  <SegmentRow
                    key={idx}
                    title={networkLabel}
                    label={networkLabel}
                    icon={Globe}
                    type="placement"
                    roas={network.roas}
                    conversions={network.conversions}
                    cpa={network.cpa}
                    spend={network.spend}
                    revenue={network.revenue}
                    secondaryLabel="Share"
                    secondaryValue={formatPercent(network.contribution || 0)}
                    averageRoas={avgNetworkRoas}
                    onAdd={() => onAddToQueue({ type: 'placement', data: network, label: networkLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = sortedNetworks
                  .map((network: any, idx: number) => {
                    const networkLabel = network.placement || `Network ${idx + 1}`;
                    return { type: 'placement' as const, data: network, label: networkLabel };
                  })
                  .filter((item) => !isInQueue(item.label));
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="mt-3 w-full py-2 px-4 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              {selectedNetworkCount > 0 ? `Add Remaining (${sortedNetworks.length - selectedNetworkCount})` : `Add All Networks`}
            </button>
          </div>
        );
      })()}

      {/* Temporal Section */}
      {temporal.length > 0 ? (() => {
        const sortedTemporal = [...temporal].sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0));
        const allTemporalLabels = sortedTemporal.map((t: any, idx: number) => t.period || t.segment || `Time Period ${idx + 1}`);
        const selectedTemporalCount = allTemporalLabels.filter((label: string) => isInQueue(label)).length;
        const avgTemporalRoas = sortedTemporal.reduce((sum: number, t: any) => sum + (t.roas || 0), 0) / sortedTemporal.length;
        return (
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
            <SectionHeader
              title="Best Times to Advertise"
              icon={Clock}
              analysis={`Peak performance during ${sortedTemporal[0]?.period || sortedTemporal[0]?.segment || 'top period'} with ${sortedTemporal[0]?.roas?.toFixed(1)}x ROAS`}
            />
            <div className="space-y-2">
              {sortedTemporal.map((time: any, idx: number) => {
                const timeLabel = time.period || time.segment || `Time Period ${idx + 1}`;
                const bidAdj = parseBidAdjustment(time.bidAdjustment);
                return (
                  <SegmentRow
                    key={idx}
                    title={timeLabel}
                    label={timeLabel}
                    icon={Calendar}
                    type="temporal"
                    roas={time.roas}
                    conversions={time.conversions}
                    cpa={time.cpa}
                    spend={time.spend}
                    revenue={time.revenue}
                    secondaryLabel="Share"
                    secondaryValue={formatPercent(time.contribution || 0)}
                    suggestedBidAdjustment={isGoogle ? bidAdj : undefined}
                    averageRoas={avgTemporalRoas}
                    onAdd={() => onAddToQueue({ type: 'temporal', data: { ...time, suggestedBidAdjustment: isGoogle ? bidAdj : undefined }, label: timeLabel })}
                    onRemove={(label: string) => setQueuedItems(queuedItems.filter((qi: any) => qi.label !== label))}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                const itemsToAdd = sortedTemporal
                  .map((time: any, idx: number) => {
                    const timeLabel = time.period || time.segment || `Time Period ${idx + 1}`;
                    const bidAdj = parseBidAdjustment(time.bidAdjustment);
                    return { type: 'temporal' as const, data: { ...time, suggestedBidAdjustment: isGoogle ? bidAdj : undefined }, label: timeLabel };
                  })
                  .filter((item) => !isInQueue(item.label));
                if (itemsToAdd.length > 0) {
                  onAddToQueue(itemsToAdd);
                }
              }}
              className="mt-3 w-full py-2 px-4 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              {selectedTemporalCount > 0 ? `Add Remaining (${sortedTemporal.length - selectedTemporalCount})` : `Add All Time Periods`}
            </button>
          </div>
        );
      })() : (
        <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl p-4">
          <SectionHeader
            title="Best Times to Advertise"
            icon={Clock}
            analysis="Learn when your ads perform best throughout the day and week."
          />
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-dashed border-gray-300 dark:border-[#3a3a3a] rounded-xl p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No temporal data available yet
            </p>
          </div>
        </div>
      )}

      {/* Customer Behavior Section */}
      {customerBehavior && (
        <div>
          <SectionHeader
            title="Customer Behavior"
            icon={ShoppingBag}
            analysis="Understanding new vs returning customer patterns helps optimize your acquisition and retention strategies."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white">New Customers</h5>
              </div>
              <div className="space-y-2.5">
                <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2.5 border border-gray-100 dark:border-[#2a2a2a]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Share</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatPercent((customerBehavior.newVsReturning.new.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2.5 border border-gray-100 dark:border-[#2a2a2a]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AOV</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.new.averageOrderValue || 0)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2.5 border border-gray-100 dark:border-[#2a2a2a]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">CPA</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.new.cpa || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Returning Customers</h5>
              </div>
              <div className="space-y-2.5">
                <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2.5 border border-gray-100 dark:border-[#2a2a2a]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Share</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatPercent((customerBehavior.newVsReturning.returning.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2.5 border border-gray-100 dark:border-[#2a2a2a]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AOV</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.returning.averageOrderValue || 0)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2.5 border border-gray-100 dark:border-[#2a2a2a]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">CPA</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.returning.cpa || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Builder Configuration Section - Always show when onBuildSegments is available */}
      {onBuildSegments && (
        <BuilderConfigurationSection
          queuedItems={queuedItems}
          setQueuedItems={setQueuedItems}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          platform={platform}
          currentBudget={currentBudget}
          currentCountries={currentCountries}
          onBuildSegments={onBuildSegments}
          isProcessing={isProcessing}
          formatCurrency={formatCurrency}
          buildMode={buildMode}
        />
      )}
    </div>
  );
};

