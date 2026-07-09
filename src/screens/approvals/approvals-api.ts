import type {
  ApprovalItemView,
  ApprovalsDecidedView,
  ApprovalsQueueView,
  DecisionDto,
  DiscountReviewView,
  ScenarioReviewView,
} from "./approval-types"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export async function getQueue(): Promise<ApprovalsQueueView> {
  const res = await fetch(`${API}/approvals/queue`)
  if (!res.ok) throw new Error("Failed to load approvals queue")
  return res.json() as Promise<ApprovalsQueueView>
}

export async function getDecided(): Promise<ApprovalsDecidedView> {
  const res = await fetch(`${API}/approvals/decided`)
  if (!res.ok) throw new Error("Failed to load decided approvals")
  return res.json() as Promise<ApprovalsDecidedView>
}

export async function getScenarioReview(id: number): Promise<ScenarioReviewView> {
  const res = await fetch(`${API}/approvals/scenarios/${id}/review`)
  if (!res.ok) throw new Error("Failed to load scenario review")
  return res.json() as Promise<ScenarioReviewView>
}

export async function getDiscountReview(id: number): Promise<DiscountReviewView> {
  const res = await fetch(`${API}/approvals/discounts/${id}/review`)
  if (!res.ok) throw new Error("Failed to load discount review")
  return res.json() as Promise<DiscountReviewView>
}

export async function decideScenario(id: number, dto: DecisionDto): Promise<ApprovalItemView> {
  const res = await fetch(`${API}/approvals/scenarios/${id}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error("Failed to record scenario decision")
  return res.json() as Promise<ApprovalItemView>
}

export async function decideDiscount(id: number, dto: DecisionDto): Promise<ApprovalItemView> {
  const res = await fetch(`${API}/approvals/discounts/${id}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error("Failed to record discount decision")
  return res.json() as Promise<ApprovalItemView>
}
