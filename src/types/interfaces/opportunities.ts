export interface PipelineStage {
  id: number;
  uid: string;
  pipelineId: number;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: number;
  uid: string;
  businessId: number;
  name: string;
  order: number;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityResponse {
  id: number;
  uid: string;
  businessId: number;
  customerId?: number;
  stageId: number;
  name: string;
  value: number;
  status: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
