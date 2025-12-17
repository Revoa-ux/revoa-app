import { flowStateService } from './flowStateService';

export interface FlowTrigger {
  category: string;
  keywords: string[];
  autoStart: boolean;
}

const FLOW_TRIGGERS: FlowTrigger[] = [
  {
    category: 'return',
    keywords: ['return', 'send back', 'dont want'],
    autoStart: true,
  },
  {
    category: 'damage',
    keywords: ['damaged', 'broken', 'not working', 'issue with'],
    autoStart: true,
  },
  {
    category: 'defective',
    keywords: ['defective', 'defect', 'faulty', 'malfunction'],
    autoStart: true,
  },
  {
    category: 'cancel_modify',
    keywords: ['cancel', 'modify', 'change order', 'update order'],
    autoStart: true,
  },
  {
    category: 'wrong_item',
    keywords: ['wrong item', 'incorrect item', 'wrong product', 'not what i ordered'],
    autoStart: true,
  },
  {
    category: 'missing_items',
    keywords: ['missing', 'missing item', 'didnt receive', 'incomplete order'],
    autoStart: true,
  },
  {
    category: 'shipping',
    keywords: ['shipping', 'delivery', 'tracking', 'not arrived', 'delayed'],
    autoStart: true,
  },
  {
    category: 'refund',
    keywords: ['refund', 'money back', 'reimburse'],
    autoStart: true,
  },
  {
    category: 'replacement',
    keywords: ['replacement', 'replace', 'exchange', 'swap'],
    autoStart: true,
  },
];

export class FlowTriggerService {
  private mapTagToCategory(tag: string): string {
    const tagLower = tag.toLowerCase();

    // Map tag variations to their flow categories
    if (tagLower === 'damaged') {
      return 'damage';
    }
    if (tagLower === 'cancel' || tagLower === 'modify') {
      return 'cancel_modify';
    }

    return tagLower;
  }

  async suggestFlowForThread(threadId: string, threadTitle?: string, threadTag?: string): Promise<string | null> {
    if (threadTag) {
      const tagLower = threadTag.toLowerCase();
      const mappedCategory = this.mapTagToCategory(tagLower);

      // First try direct category match with mapped category
      for (const trigger of FLOW_TRIGGERS) {
        if (trigger.category === mappedCategory || trigger.category === tagLower) {
          const flows = await flowStateService.getActiveFlowsByCategory(trigger.category);
          if (flows.length > 0) {
            return flows[0].id;
          }
        }
      }

      // Then try keyword matching
      for (const trigger of FLOW_TRIGGERS) {
        if (trigger.keywords.some(kw => tagLower.includes(kw))) {
          const flows = await flowStateService.getActiveFlowsByCategory(trigger.category);
          if (flows.length > 0) {
            return flows[0].id;
          }
        }
      }
    }

    if (threadTitle) {
      const titleLower = threadTitle.toLowerCase();

      for (const trigger of FLOW_TRIGGERS) {
        if (trigger.keywords.some(kw => titleLower.includes(kw))) {
          const flows = await flowStateService.getActiveFlowsByCategory(trigger.category);
          if (flows.length > 0) {
            return flows[0].id;
          }
        }
      }
    }

    return null;
  }

  async startFlowForThread(threadId: string, flowId: string): Promise<boolean> {
    try {
      await flowStateService.startFlowSession(threadId, flowId);
      return true;
    } catch (error) {
      console.error('Failed to start flow:', error);
      return false;
    }
  }

  async autoStartFlowIfNeeded(
    threadId: string,
    threadTitle?: string,
    threadTag?: string
  ): Promise<boolean> {
    const flowId = await this.suggestFlowForThread(threadId, threadTitle, threadTag);

    if (!flowId) return false;

    const mappedCategory = threadTag ? this.mapTagToCategory(threadTag) : null;

    const categoryMatch = FLOW_TRIGGERS.find(t => {
      if (mappedCategory && t.category === mappedCategory) return true;
      if (threadTag && t.category === threadTag.toLowerCase()) return true;
      if (threadTitle && t.keywords.some(kw => threadTitle.toLowerCase().includes(kw))) return true;
      return false;
    });

    if (categoryMatch?.autoStart) {
      return await this.startFlowForThread(threadId, flowId);
    }

    return false;
  }

  getAvailableFlows(): FlowTrigger[] {
    return FLOW_TRIGGERS;
  }
}

export const flowTriggerService = new FlowTriggerService();
