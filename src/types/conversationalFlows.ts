export type FlowNodeType =
  | 'question'
  | 'info'
  | 'decision'
  | 'action'
  | 'attachment'
  | 'completion';

export type FlowResponseType =
  | 'single_choice'
  | 'multiple_choice'
  | 'text_input'
  | 'number_input'
  | 'date_input';

export interface FlowResponseOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
}

export interface FlowValidation {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface FlowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  content: string;
  responseType?: FlowResponseType;
  options?: FlowResponseOption[];
  validations?: FlowValidation[];
  nextNodeId?: string;
  conditionalNext?: {
    conditions: FlowCondition[];
    nodeId: string;
  }[];
  metadata?: {
    helpText?: string;
    skipable?: boolean;
    templateSuggestions?: string[];
    actionType?: 'open_template' | 'collect_data' | 'external_action';
    actionData?: any;
    attachmentConfig?: {
      minFiles?: number;
      maxFiles?: number;
      acceptedTypes?: string[];
      description?: string;
    };
    pauseReason?: 'awaiting_photos' | 'awaiting_factory_response' | 'awaiting_customer';
  };
}

export interface FlowDefinition {
  id: string;
  startNodeId: string;
  nodes: FlowNode[];
  metadata?: {
    estimatedTime?: number;
    category?: string;
    tags?: string[];
  };
}

export interface BotFlow {
  id: string;
  category: string;
  name: string;
  description: string;
  flow_definition: FlowDefinition;
  version: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FlowState {
  [nodeId: string]: {
    response: any;
    respondedAt: string;
  };
}

export interface ThreadFlowSession {
  id: string;
  thread_id: string;
  flow_id: string;
  current_node_id: string;
  flow_state: FlowState;
  started_at: string;
  last_interaction_at: string;
  completed_at?: string;
  is_active: boolean;
  paused_at?: string;
  pause_reason?: string;
  pause_note?: string;
}

export interface FlowResponse {
  id: string;
  session_id: string;
  node_id: string;
  response_value: any;
  responded_at: string;
}

export interface FlowAnalytics {
  id: string;
  flow_id: string;
  node_id: string;
  total_views: number;
  total_responses: number;
  completion_count: number;
  average_time_seconds: number;
  last_updated: string;
}

export interface FlowExecutionContext {
  session: ThreadFlowSession;
  flow: BotFlow;
  currentNode: FlowNode;
  threadData?: {
    orderId?: string;
    shopifyOrderId?: string;
    orderStatus?: string;
    metadata?: any;
  };
  warrantyContext?: {
    hasOrder: boolean;
    orderWarrantyStatus?: 'active' | 'expired' | 'mixed' | 'none';
    warrantyExpiryDate?: string;
    productCoverages?: {
      damaged: boolean;
      lost: boolean;
      late: boolean;
    };
    orderAgeInDays?: number;
  };
  attachmentContext?: {
    hasPhotosAttached: boolean;
    attachmentUrls: string[];
    attachmentCount: number;
  };
}

export interface FlowNavigationResult {
  nextNode: FlowNode | null;
  completed: boolean;
  error?: string;
}

export interface FlowMessageData {
  sessionId: string;
  flowId: string;
  nodeId: string;
  node: FlowNode;
  isCurrentStep: boolean;
  previousResponse?: any;
}
