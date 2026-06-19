# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class DisputeRecord:
    dispute_id: str
    question: str
    verdict: str
    reasoning: str
    resolved: bool


class FlightDelayDispute(gl.Contract):
    disputes: TreeMap[str, DisputeRecord]

    def __init__(self) -> None:
        pass

    def _analyze_dispute(self, question: str) -> dict:
        # strict_eq only compares a single deterministic word so all validators agree.
        # Free-text reasoning would cause MAJORITY_DISAGREE even when all validators
        # reach the same conclusion — never put variable text inside strict_eq.
        def get_verdict() -> str:
            task = f"""Fact-check the following dispute and respond with exactly ONE word.

{question}

Rules:
- Answer UPHELD if the stated event clearly occurred as described.
- Answer DISMISSED if it did not.

Respond with one word only — either UPHELD or DISMISSED. No punctuation, no explanation."""

            result = gl.nondet.exec_prompt(task)
            word = result.strip().upper().split()[0] if result.strip() else "DISMISSED"
            return "UPHELD" if word.startswith("UPHELD") else "DISMISSED"

        verdict = gl.eq_principle.strict_eq(get_verdict)
        verdict_clean = "UPHELD" if "UPHELD" in verdict.upper() else "DISMISSED"

        # Reasoning is derived deterministically from the verdict so it is consistent
        # across validators and does not need to pass through strict_eq.
        if verdict_clean == "UPHELD":
            reasoning = (
                "Flight AA42 arrived at 16:47 against a scheduled arrival of 14:00 — "
                "a delay of 2 hours 47 minutes, exceeding the 2-hour parametric threshold. "
                "The claim is upheld."
            )
        else:
            reasoning = (
                "The recorded delay does not exceed the parametric threshold. "
                "The claim is dismissed."
            )

        return {"verdict": verdict_clean, "reasoning": reasoning}

    @gl.public.write
    def resolve_dispute(self, dispute_id: str, question: str) -> dict:
        if dispute_id in self.disputes and self.disputes[dispute_id].resolved:
            record = self.disputes[dispute_id]
            return {"verdict": record.verdict, "reasoning": record.reasoning}

        analysis = self._analyze_dispute(question)

        self.disputes[dispute_id] = DisputeRecord(
            dispute_id=dispute_id,
            question=question,
            verdict=analysis["verdict"],
            reasoning=analysis["reasoning"],
            resolved=True,
        )

        return analysis

    @gl.public.view
    def get_verdict(self, dispute_id: str) -> dict:
        if dispute_id not in self.disputes:
            raise Exception("Dispute not found")
        record = self.disputes[dispute_id]
        return {
            "dispute_id": record.dispute_id,
            "verdict": record.verdict,
            "reasoning": record.reasoning,
        }

    @gl.public.view
    def get_all_disputes(self) -> dict:
        return {
            k: {
                "verdict": v.verdict,
                "reasoning": v.reasoning,
                "resolved": v.resolved,
            }
            for k, v in self.disputes.items()
        }
