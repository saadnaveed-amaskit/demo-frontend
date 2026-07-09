import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type {
  ApprovalDomain,
  ApprovalItemView,
  ApprovalRisk,
  DiscountReviewView,
  ScenarioReviewView,
} from "./approval-types"
import {
  decideDiscount,
  decideScenario,
  getDecided,
  getDiscountReview,
  getQueue,
  getScenarioReview,
} from "./approvals-api"

const PAGE_TRANSITION = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: "easeOut" as const } }

type Tab = "scenarios" | "discounts"
type ActionType = "deny" | "request_changes"

interface ActiveAction {
  domain: ApprovalDomain
  id: number
  type: ActionType
}

const RISK_COLORS: Record<ApprovalRisk, string> = {
  Low: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  High: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
}

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
  denied: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  returned: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
}

function RiskBadge({ risk }: { risk: ApprovalRisk }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[risk]}`}>{risk}</span>
}

interface RowProps {
  item: ApprovalItemView
  active: ActiveAction | null
  reasonText: string
  onReasonChange: (v: string) => void
  onOpenAction: (type: ActionType) => void
  onCancelAction: () => void
  onConfirmAction: () => void
  onApprove: () => void
  onView: () => void
}

function ApprovalRow({ item, active, reasonText, onReasonChange, onOpenAction, onCancelAction, onConfirmAction, onApprove, onView }: RowProps) {
  const isDenyOpen = active?.type === "deny"
  const isReturnOpen = active?.type === "request_changes"
  const commentValid = reasonText.trim().length > 0

  return (
    <div
      data-testid="approval-row"
      onClick={onView}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3 cursor-pointer hover:border-teal-400 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item.name}</span>
          <span className="text-xs text-zinc-500">
            {item.submitter} · {item.team} · {item.brand} / {item.division}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">{item.impact}</span>
          <RiskBadge risk={item.risk} />
        </div>
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" data-testid="approve-btn" onClick={onApprove}>
          Approve
        </Button>
        <Button size="sm" variant="outline" data-testid="return-btn" onClick={() => onOpenAction("request_changes")}>
          Request Changes
        </Button>
        <Button size="sm" variant="outline" data-testid="deny-btn" onClick={() => onOpenAction("deny")}>
          Deny
        </Button>
      </div>

      {(isDenyOpen || isReturnOpen) && (
        <div className="flex flex-col gap-2 rounded-md bg-zinc-50 dark:bg-zinc-900 p-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            data-testid={isDenyOpen ? "deny-reason-input" : "return-comment-input"}
            value={reasonText}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={isDenyOpen ? "Reason for denial (required)" : "Comment for submitter (required)"}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-testid={isDenyOpen ? "deny-confirm-btn" : "return-confirm-btn"}
              disabled={!commentValid}
              onClick={onConfirmAction}
            >
              Confirm {isDenyOpen ? "Deny" : "Return for Changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelAction}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DecidedTable({ items }: { items: ApprovalItemView[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No decided items yet.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
          <th className="py-1.5 pr-2">Name</th>
          <th className="py-1.5 pr-2">Submitter</th>
          <th className="py-1.5 pr-2">Brand / Division</th>
          <th className="py-1.5 pr-2">Impact</th>
          <th className="py-1.5 pr-2">Risk</th>
          <th className="py-1.5 pr-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.domain}-${item.id}`} data-testid="decided-table-row" className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-1.5 pr-2">{item.name}</td>
            <td className="py-1.5 pr-2 text-zinc-500">{item.submitter}</td>
            <td className="py-1.5 pr-2 text-zinc-500">
              {item.brand} / {item.division}
            </td>
            <td className="py-1.5 pr-2">{item.impact}</td>
            <td className="py-1.5 pr-2">
              <RiskBadge risk={item.risk} />
            </td>
            <td className="py-1.5 pr-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[item.status] ?? ""}`}>{item.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ScenarioReview({ review, onBack, onApprove, onOpenDeny, onOpenReturn, active, reasonText, onReasonChange, onCancelAction, onConfirmAction }: {
  review: ScenarioReviewView
  onBack: () => void
  onApprove: () => void
  onOpenDeny: () => void
  onOpenReturn: () => void
  active: ActiveAction | null
  reasonText: string
  onReasonChange: (v: string) => void
  onCancelAction: () => void
  onConfirmAction: () => void
}) {
  const isDenyOpen = active?.type === "deny"
  const isReturnOpen = active?.type === "request_changes"
  const commentValid = reasonText.trim().length > 0

  return (
    <div data-testid="scenario-review-drawer" className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← Back to queue
      </Button>
      <div>
        <h3 className="text-base font-semibold">{review.name}</h3>
        <p className="text-xs text-zinc-500">
          {review.submitter} · {review.team} · {review.brand} / {review.division}
        </p>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{review.output.narrative}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-1.5 pr-2">Metric</th>
            <th className="py-1.5 pr-2">Current</th>
            <th className="py-1.5 pr-2">Scenario</th>
            <th className="py-1.5 pr-2">ML Rec.</th>
          </tr>
        </thead>
        <tbody>
          {review.output.comparison.map((row) => (
            <tr key={row.metric} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-1.5 pr-2">{row.metric}</td>
              <td className="py-1.5 pr-2 text-zinc-500">{row.current}</td>
              <td className="py-1.5 pr-2">{row.scenario}</td>
              <td className="py-1.5 pr-2 text-zinc-500">{row.mlRec}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div data-testid="scenario-guardrail-results" className="flex flex-col gap-1">
        {review.output.guardrailResults.map((g) => (
          <div key={g.id} className="text-xs flex items-center gap-2">
            <span className={g.passed ? "text-teal-600" : "text-red-600"}>{g.passed ? "Pass" : "Fail"}</span>
            <span>{g.rule}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" data-testid="approve-btn" onClick={onApprove}>
          Approve
        </Button>
        <Button size="sm" variant="outline" data-testid="return-btn" onClick={onOpenReturn}>
          Request Changes
        </Button>
        <Button size="sm" variant="outline" data-testid="deny-btn" onClick={onOpenDeny}>
          Deny
        </Button>
      </div>
      {(isDenyOpen || isReturnOpen) && (
        <div className="flex flex-col gap-2 rounded-md bg-zinc-50 dark:bg-zinc-900 p-2">
          <textarea
            data-testid={isDenyOpen ? "deny-reason-input" : "return-comment-input"}
            value={reasonText}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={isDenyOpen ? "Reason for denial (required)" : "Comment for submitter (required)"}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-testid={isDenyOpen ? "deny-confirm-btn" : "return-confirm-btn"}
              disabled={!commentValid}
              onClick={onConfirmAction}
            >
              Confirm {isDenyOpen ? "Deny" : "Return for Changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelAction}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DiscountReview({ review, onBack, onApprove, onOpenDeny, onOpenReturn, active, reasonText, onReasonChange, onCancelAction, onConfirmAction }: {
  review: DiscountReviewView
  onBack: () => void
  onApprove: () => void
  onOpenDeny: () => void
  onOpenReturn: () => void
  active: ActiveAction | null
  reasonText: string
  onReasonChange: (v: string) => void
  onCancelAction: () => void
  onConfirmAction: () => void
}) {
  const isDenyOpen = active?.type === "deny"
  const isReturnOpen = active?.type === "request_changes"
  const commentValid = reasonText.trim().length > 0

  return (
    <div data-testid="discount-review-drawer" className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← Back to queue
      </Button>
      <div>
        <h3 className="text-base font-semibold">{review.name}</h3>
        <p className="text-xs text-zinc-500">
          {review.submitter} · {review.team} · {review.brand} / {review.division}
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
        <span className="text-xs text-zinc-500">Risk banner:</span>
        <span data-testid="risk-banner-hard-count" className="text-xs font-medium text-red-600">
          {review.riskBanner.hardCount} hard
        </span>
        <span data-testid="risk-banner-advisory-count" className="text-xs font-medium text-amber-600">
          {review.riskBanner.advisoryCount} advisory
        </span>
        <span className="text-xs text-zinc-600 dark:text-zinc-400">Impact: {review.impact}</span>
      </div>
      {review.constraintWarnings.length > 0 && (
        <div data-testid="constraint-warnings" className="flex flex-col gap-1">
          {review.constraintWarnings.map((w) => (
            <span key={w} className="text-xs text-amber-700 dark:text-amber-300">
              {w}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" data-testid="approve-btn" onClick={onApprove}>
          Approve
        </Button>
        <Button size="sm" variant="outline" data-testid="return-btn" onClick={onOpenReturn}>
          Request Changes
        </Button>
        <Button size="sm" variant="outline" data-testid="deny-btn" onClick={onOpenDeny}>
          Deny
        </Button>
      </div>
      {(isDenyOpen || isReturnOpen) && (
        <div className="flex flex-col gap-2 rounded-md bg-zinc-50 dark:bg-zinc-900 p-2">
          <textarea
            data-testid={isDenyOpen ? "deny-reason-input" : "return-comment-input"}
            value={reasonText}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={isDenyOpen ? "Reason for denial (required)" : "Comment for submitter (required)"}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-testid={isDenyOpen ? "deny-confirm-btn" : "return-confirm-btn"}
              disabled={!commentValid}
              onClick={onConfirmAction}
            >
              Confirm {isDenyOpen ? "Deny" : "Return for Changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelAction}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ApprovalsScreen() {
  const [tab, setTab] = useState<Tab>("scenarios")
  const [pendingScenarios, setPendingScenarios] = useState<ApprovalItemView[]>([])
  const [pendingDiscounts, setPendingDiscounts] = useState<ApprovalItemView[]>([])
  const [decidedScenarios, setDecidedScenarios] = useState<ApprovalItemView[]>([])
  const [decidedDiscounts, setDecidedDiscounts] = useState<ApprovalItemView[]>([])
  const [reviewing, setReviewing] = useState<{ domain: ApprovalDomain; id: number } | null>(null)
  const [scenarioReview, setScenarioReview] = useState<ScenarioReviewView | null>(null)
  const [discountReview, setDiscountReview] = useState<DiscountReviewView | null>(null)
  const [active, setActive] = useState<ActiveAction | null>(null)
  const [reasonText, setReasonText] = useState("")

  async function refresh() {
    const [queue, decided] = await Promise.all([getQueue(), getDecided()])
    setPendingScenarios(queue.scenarios)
    setPendingDiscounts(queue.discounts)
    setDecidedScenarios(decided.scenarios)
    setDecidedDiscounts(decided.discounts)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function openReview(domain: ApprovalDomain, id: number) {
    setReviewing({ domain, id })
    setActive(null)
    setReasonText("")
    if (domain === "scenario") {
      setScenarioReview(await getScenarioReview(id))
    } else {
      setDiscountReview(await getDiscountReview(id))
    }
  }

  function backToQueue() {
    setReviewing(null)
    setScenarioReview(null)
    setDiscountReview(null)
    setActive(null)
    setReasonText("")
  }

  async function submitDecision(domain: ApprovalDomain, id: number, action: ActiveAction["type"] | "approve", comment?: string) {
    if (domain === "scenario") {
      await decideScenario(id, { action, comment })
    } else {
      await decideDiscount(id, { action, comment })
    }
    setActive(null)
    setReasonText("")
    if (reviewing) backToQueue()
    await refresh()
  }

  const tabItems: { key: Tab; label: string; count: number }[] = [
    { key: "scenarios", label: "Price Scenarios", count: pendingScenarios.length },
    { key: "discounts", label: "Discounts", count: pendingDiscounts.length },
  ]

  const activePending = tab === "scenarios" ? pendingScenarios : pendingDiscounts
  const activeDecided = tab === "scenarios" ? decidedScenarios : decidedDiscounts

  return (
    <motion.div {...PAGE_TRANSITION} className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Approvals</h1>

      {!reviewing && (
        <>
          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
            {tabItems.map((t) => (
              <button
                key={t.key}
                data-testid={`approval-tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                  tab === t.key ? "border-teal-500 text-teal-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {activePending.length === 0 && <p className="text-sm text-zinc-500">No pending items.</p>}
            {activePending.map((item) => (
              <ApprovalRow
                key={`${item.domain}-${item.id}`}
                item={item}
                active={active?.domain === item.domain && active.id === item.id ? active : null}
                reasonText={active?.domain === item.domain && active.id === item.id ? reasonText : ""}
                onReasonChange={setReasonText}
                onOpenAction={(type) => {
                  setActive({ domain: item.domain, id: item.id, type })
                  setReasonText("")
                }}
                onCancelAction={() => {
                  setActive(null)
                  setReasonText("")
                }}
                onConfirmAction={() => void submitDecision(item.domain, item.id, active!.type, reasonText.trim())}
                onApprove={() => void submitDecision(item.domain, item.id, "approve")}
                onView={() => void openReview(item.domain, item.id)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Decided</h2>
            <DecidedTable items={activeDecided} />
          </div>
        </>
      )}

      {reviewing && reviewing.domain === "scenario" && scenarioReview && (
        <ScenarioReview
          review={scenarioReview}
          onBack={backToQueue}
          onApprove={() => void submitDecision("scenario", reviewing.id, "approve")}
          onOpenDeny={() => {
            setActive({ domain: "scenario", id: reviewing.id, type: "deny" })
            setReasonText("")
          }}
          onOpenReturn={() => {
            setActive({ domain: "scenario", id: reviewing.id, type: "request_changes" })
            setReasonText("")
          }}
          active={active}
          reasonText={reasonText}
          onReasonChange={setReasonText}
          onCancelAction={() => {
            setActive(null)
            setReasonText("")
          }}
          onConfirmAction={() => void submitDecision("scenario", reviewing.id, active!.type, reasonText.trim())}
        />
      )}

      {reviewing && reviewing.domain === "discount" && discountReview && (
        <DiscountReview
          review={discountReview}
          onBack={backToQueue}
          onApprove={() => void submitDecision("discount", reviewing.id, "approve")}
          onOpenDeny={() => {
            setActive({ domain: "discount", id: reviewing.id, type: "deny" })
            setReasonText("")
          }}
          onOpenReturn={() => {
            setActive({ domain: "discount", id: reviewing.id, type: "request_changes" })
            setReasonText("")
          }}
          active={active}
          reasonText={reasonText}
          onReasonChange={setReasonText}
          onCancelAction={() => {
            setActive(null)
            setReasonText("")
          }}
          onConfirmAction={() => void submitDecision("discount", reviewing.id, active!.type, reasonText.trim())}
        />
      )}
    </motion.div>
  )
}
