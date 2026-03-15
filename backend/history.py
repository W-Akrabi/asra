"""
history.py — Search history manager for EcoLens.

Records every completed analysis so users can browse past lookups.
Shares the same SQLite database as cache.py (ecolens.db).
"""

import json
import os
import sqlite3
import time

_DB_PATH = os.path.join(os.path.dirname(__file__), "ecolens.db")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            product     TEXT    NOT NULL,
            product_key TEXT    NOT NULL,
            report      TEXT    NOT NULL,
            timestamp   REAL    NOT NULL
        )
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC)"
    )
    conn.commit()


def add_entry(product: str, report: dict) -> None:
    """Append a completed analysis to the history log."""
    key = product.lower().strip()
    with _connect() as conn:
        _init_db(conn)
        conn.execute(
            "INSERT INTO history (product, product_key, report, timestamp) VALUES (?, ?, ?, ?)",
            (product, key, json.dumps(report), time.time()),
        )


def get_recent(limit: int = 20) -> list[dict]:
    """Return the most recent *limit* history entries, newest first."""
    with _connect() as conn:
        _init_db(conn)
        rows = conn.execute(
            """
            SELECT id, product, report, timestamp
            FROM history
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "product": row["product"],
            "report": json.loads(row["report"]),
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]


def get_by_product(product: str, limit: int = 5) -> list[dict]:
    """Return past analyses for a specific product (most recent first)."""
    key = product.lower().strip()
    with _connect() as conn:
        _init_db(conn)
        rows = conn.execute(
            """
            SELECT id, product, report, timestamp
            FROM history
            WHERE product_key = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (key, limit),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "product": row["product"],
            "report": json.loads(row["report"]),
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]


def clear() -> int:
    """Wipe all history. Returns number of rows deleted."""
    with _connect() as conn:
        _init_db(conn)
        cur = conn.execute("DELETE FROM history")
        return cur.rowcount
