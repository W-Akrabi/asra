"""
Quick smoke test for the agent. Run from the backend directory:

    python3 test_agent.py
    python3 test_agent.py "Oatly Barista Edition"
"""

import asyncio
import json
import sys
from dotenv import load_dotenv
load_dotenv()  # must happen before agent.py reads os.getenv

PRODUCT = sys.argv[1] if len(sys.argv) > 1 else "Nutella"

TYPE_ICONS = {
    "thinking":  "🤔",
    "searching": "🔍",
    "reading":   "📄",
    "scoring":   "📊",
    "done":      "✅",
    "error":     "❌",
}


async def main():
    # Import here so errors surface clearly
    from agent import run_agent

    print(f"\n{'─'*60}")
    print(f"  Testing agent with product: {PRODUCT}")
    print(f"{'─'*60}\n")

    tool_calls = []
    final_report = None

    async for event in run_agent(PRODUCT):
        icon = TYPE_ICONS.get(event["type"], "·")
        print(f"  {icon}  [{event['type'].upper()}]  {event['message']}")

        if event["type"] in ("searching", "reading"):
            tool_calls.append(event["message"])

        if event["type"] == "done" and event.get("data"):
            final_report = event["data"]

        if event["type"] == "error":
            print(f"\n  Error detail: {event.get('data', {})}")

    # Summary
    print(f"\n{'─'*60}")
    print(f"  Tool calls fired: {len(tool_calls)}")
    for t in tool_calls:
        print(f"    · {t}")

    if final_report:
        print(f"\n  Overall score : {final_report.get('overall_score')}")
        print(f"  Product       : {final_report.get('product')}")
        print(f"  Brand         : {final_report.get('brand')}")
        print(f"\n  Dimensions:")
        for dim in final_report.get("dimensions", []):
            ev_count = len(dim.get("evidence", []))
            print(f"    {dim['name']:15}  score={dim['score']}  confidence={dim['confidence']}  evidence={ev_count} items")
        print(f"\n  Summary: {final_report.get('summary')}")
    else:
        print("\n  No final report produced.")

    print(f"{'─'*60}\n")


asyncio.run(main())
