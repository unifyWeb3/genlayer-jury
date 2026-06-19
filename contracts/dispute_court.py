# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class VerdictRecord:
    dispute_id: str
    question: str
    mode: str
    criteria: str
    verdict: str    # "UPHELD" | "DISMISSED"
    reasoning: str  # stored from leader's analysis field


class DisputeCourt(gl.Contract):
    verdicts: TreeMap[str, VerdictRecord]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def resolve_dispute(
        self, dispute_id: str, question: str, mode: str, criteria: str
    ) -> dict:
        # Idempotent: return the stored verdict if this dispute was already resolved.
        if dispute_id in self.verdicts:
            r = self.verdicts[dispute_id]
            return {"verdict": r.verdict, "reasoning": r.reasoning}

        def leader_fn():
            prompt = f"""You are an impartial arbitration judge.

Dispute: {question}

Evaluation criteria: {criteria}

Analyze the dispute and return a JSON object with exactly these two fields:
{{
    "analysis": "your 2-3 sentence reasoning about whether the criteria are met",
    "verdict": "UPHELD or DISMISSED"
}}

Rules:
- verdict must be exactly the word UPHELD (criteria are met) or DISMISSED (criteria are not met)
- Do not include any text outside the JSON object"""

            response = gl.nondet.exec_prompt(prompt, response_format="json")

            # response_format="json" returns a dict directly; if it's already a dict, use it.
            # If it's a string (older SDK behaviour), parse it.
            if isinstance(response, dict):
                return response

            try:
                return json.loads(response)
            except (json.JSONDecodeError, TypeError):
                # Last resort: extract the JSON object from any surrounding text.
                import re
                match = re.search(r'\{[^{}]*"verdict"[^{}]*\}', str(response), re.DOTALL)
                if match:
                    return json.loads(match.group())
                raise gl.vm.UserError("LLM did not return parseable JSON")

        def validator_fn(leader_result) -> bool:
            # Guard against leader errors — a failed leader is a rejected round.
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_data = leader_fn()
            leader_data = leader_result.calldata
            # Compare ONLY the verdict decision field.
            # The analysis/reasoning field WILL differ between validators — that is expected
            # and is the whole point of non-comparative mode: same conclusion, different paths.
            return leader_data["verdict"] == validator_data["verdict"]

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        verdict = str(result.get("verdict", "DISMISSED")).upper().strip()
        if verdict not in ("UPHELD", "DISMISSED"):
            verdict = "DISMISSED"
        reasoning = str(result.get("analysis", ""))

        self.verdicts[dispute_id] = VerdictRecord(
            dispute_id=dispute_id,
            question=question,
            mode=mode,
            criteria=criteria,
            verdict=verdict,
            reasoning=reasoning,
        )

        return {"verdict": verdict, "reasoning": reasoning}

    @gl.public.view
    def get_verdict(self, dispute_id: str) -> dict:
        if dispute_id not in self.verdicts:
            raise Exception(f"Dispute not found: {dispute_id}")
        r = self.verdicts[dispute_id]
        return {
            "dispute_id": r.dispute_id,
            "verdict": r.verdict,
            "reasoning": r.reasoning,
            "mode": r.mode,
        }

    @gl.public.view
    def get_all_verdicts(self) -> dict:
        return {
            k: {"verdict": v.verdict, "reasoning": v.reasoning, "mode": v.mode}
            for k, v in self.verdicts.items()
        }
