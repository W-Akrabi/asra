"""
cache.py — SQLite-backed result cache for EcoLens sustainability reports.

Keyed by normalised product name. TTL defaults to 24 hours.
No external dependencies beyond the stdlib sqlite3 module.
"""

import json
import os
import sqlite3
import time

_DB_PATH = os.path.join(os.path.dirname(__file__), "ecolens.db")
_DEFAULT_TTL = 60 * 60 * 24  # 24 hours


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            product_key TEXT PRIMARY KEY,
            report      TEXT    NOT NULL,
            created_at  REAL    NOT NULL,
            expires_at  REAL    NOT NULL
        )
    """)
    conn.commit()


def _normalise(product: str) -> str:
    return product.lower().strip()


def get(product: str) -> dict | None:
    """Return a cached report for *product*, or None if missing / expired."""
    key = _normalise(product)
    with _connect() as conn:
        _init_db(conn)
        row = conn.execute(
            "SELECT report, expires_at FROM cache WHERE product_key = ?", (key,)
        ).fetchone()
    if row is None:
        return None
    if time.time() > row["expires_at"]:
        # Expired — evict lazily
        _delete(key)
        return None
    return json.loads(row["report"])


def set(product: str, report: dict, ttl: int = _DEFAULT_TTL) -> None:
    """Cache *report* for *product* with a given TTL in seconds."""
    key = _normalise(product)
    now = time.time()
    with _connect() as conn:
        _init_db(conn)
        conn.execute(
            """
            INSERT INTO cache (product_key, report, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(product_key) DO UPDATE SET
                report     = excluded.report,
                created_at = excluded.created_at,
                expires_at = excluded.expires_at
            """,
            (key, json.dumps(report), now, now + ttl),
        )


def _delete(product_key: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM cache WHERE product_key = ?", (product_key,))


def purge_expired() -> int:
    """Delete all expired entries. Returns count removed."""
    with _connect() as conn:
        _init_db(conn)
        cur = conn.execute("DELETE FROM cache WHERE expires_at < ?", (time.time(),))
        return cur.rowcount


def status() -> dict:
    """Return cache stats: entry count, expired count, and DB file size."""
    now = time.time()
    with _connect() as conn:
        _init_db(conn)
        total = conn.execute("SELECT COUNT(*) FROM cache").fetchone()[0]
        expired = conn.execute(
            "SELECT COUNT(*) FROM cache WHERE expires_at < ?", (now,)
        ).fetchone()[0]
    db_bytes = os.path.getsize(_DB_PATH) if os.path.exists(_DB_PATH) else 0
    return {
        "entries": total,
        "expired": expired,
        "active": total - expired,
        "db_size_kb": round(db_bytes / 1024, 1),
    }
