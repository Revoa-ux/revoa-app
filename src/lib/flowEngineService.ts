import type {
  BotFlow,
  FlowNode,
  FlowCondition,
  FlowNavigationResult,
  FlowExecutionContext,
  FlowState,
} from '../types/conversationalFlows';

export class FlowEngineService {
  parseFlow(flow: BotFlow): FlowNode[] {
    return flow.flow_definition.nodes;
  }

  getStartNode(flow: BotFlow): FlowNode | null {
    const nodes = this.parseFlow(flow);
    const startNodeId = flow.flow_definition.startNodeId;
    return nodes.find(node => node.id === startNodeId) || null;
  }

  getNodeById(flow: BotFlow, nodeId: string): FlowNode | null {
    const nodes = this.parseFlow(flow);
    return nodes.find(node => node.id === nodeId) || null;
  }

  evaluateCondition(
    condition: FlowCondition,
    value: any,
    flowState: FlowState,
    currentNodeId?: string
  ): boolean {
    // If the condition field matches the current node ID, use the current response value
    // Otherwise, look it up in the flow state (for checking previous responses)
    const fieldValue = (condition.field === currentNodeId)
      ? value
      : flowState[condition.field]?.response;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'not_equals':
        return fieldValue !== condition.value;

      case 'contains':
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(condition.value);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return false;

      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);

      case 'less_than':
        return Number(fieldValue) < Number(condition.value);

      case 'in':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(fieldValue);
        }
        return false;

      case 'not_in':
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(fieldValue);
        }
        return false;

      default:
        return false;
    }
  }

  evaluateConditions(
    conditions: FlowCondition[],
    flowState: FlowState,
    currentResponse?: any,
    currentNodeId?: string
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogic: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(
        condition,
        currentResponse,
        flowState,
        currentNodeId
      );

      if (currentLogic === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogic = condition.logic || 'AND';
    }

    return result;
  }

  determineNextNode(
    context: FlowExecutionContext,
    currentResponse: any
  ): FlowNavigationResult {
    const { currentNode, flow, session } = context;

    console.log('[flowEngine] determineNextNode:', {
      currentNodeId: currentNode.id,
      currentNodeType: currentNode.type,
      hasConditionalNext: !!currentNode.conditionalNext?.length,
      nextNodeId: currentNode.nextNodeId,
    });

    if (currentNode.type === 'completion') {
      return {
        nextNode: null,
        completed: true,
      };
    }

    if (currentNode.conditionalNext && currentNode.conditionalNext.length > 0) {
      for (const conditional of currentNode.conditionalNext) {
        if (this.evaluateConditions(conditional.conditions, session.flow_state, currentResponse, currentNode.id)) {
          const nextNode = this.getNodeById(flow, conditional.nodeId);
          if (nextNode) {
            console.log('[flowEngine] Using conditional next node:', nextNode.id);
            return {
              nextNode,
              completed: false,
            };
          }
        }
      }
    }

    if (currentNode.nextNodeId) {
      const nextNode = this.getNodeById(flow, currentNode.nextNodeId);
      if (nextNode) {
        console.log('[flowEngine] Using next node:', nextNode.id);
        return {
          nextNode,
          completed: false,
        };
      } else {
        console.error('[flowEngine] Next node not found:', currentNode.nextNodeId);
      }
    }

    console.error('[flowEngine] No valid next node found for current node:', currentNode.id);
    return {
      nextNode: null,
      completed: true,
      error: `Configuration error: No next step defined for "${currentNode.content.substring(0, 50)}..."`,
    };
  }

  validateResponse(node: FlowNode, response: any): { valid: boolean; error?: string } {
    // Info nodes don't need validation since they don't collect user input
    if (node.type === 'info' || !node.responseType) {
      return { valid: true };
    }

    if (!node.validations || node.validations.length === 0) {
      return { valid: true };
    }

    for (const validation of node.validations) {
      switch (validation.type) {
        case 'required':
          if (response === null || response === undefined || response === '') {
            return { valid: false, error: validation.message };
          }
          break;

        case 'min':
          if (typeof response === 'number' && response < validation.value) {
            return { valid: false, error: validation.message };
          }
          if (typeof response === 'string' && response.length < validation.value) {
            return { valid: false, error: validation.message };
          }
          break;

        case 'max':
          if (typeof response === 'number' && response > validation.value) {
            return { valid: false, error: validation.message };
          }
          if (typeof response === 'string' && response.length > validation.value) {
            return { valid: false, error: validation.message };
          }
          break;

        case 'pattern':
          if (typeof response === 'string') {
            const regex = new RegExp(validation.value);
            if (!regex.test(response)) {
              return { valid: false, error: validation.message };
            }
          }
          break;
      }
    }

    return { valid: true };
  }

  shouldShowNode(node: FlowNode, context: FlowExecutionContext): boolean {
    return true;
  }

  getFlowProgress(context: FlowExecutionContext): {
    current: number;
    total: number;
    percentage: number;
  } {
    const { flow, session } = context;
    const allNodes = this.parseFlow(flow);

    // Only count question and decision nodes for progress
    const progressNodes = allNodes.filter(
      node => node.type === 'question' || node.type === 'decision'
    );

    const totalNodes = progressNodes.length;

    // Count how many progress nodes have been answered
    const answeredNodes = progressNodes.filter(
      node => session.flow_state[node.id]?.response !== undefined
    ).length;

    return {
      current: answeredNodes,
      total: totalNodes,
      percentage: totalNodes > 0 ? Math.round((answeredNodes / totalNodes) * 100) : 0,
    };
  }

  isFlowCompleted(context: FlowExecutionContext): boolean {
    const { currentNode } = context;
    return currentNode.type === 'completion';
  }

  canSkipNode(node: FlowNode): boolean {
    return node.metadata?.skipable === true;
  }

  getHelpText(node: FlowNode): string | undefined {
    return node.metadata?.helpText;
  }

  getTemplateSuggestions(node: FlowNode): string[] {
    return node.metadata?.templateSuggestions || [];
  }

  extractFlowData(flowState: FlowState): Record<string, any> {
    const data: Record<string, any> = {};

    for (const [nodeId, nodeData] of Object.entries(flowState)) {
      data[nodeId] = nodeData.response;
    }

    return data;
  }
}

export const flowEngine = new FlowEngineService();
