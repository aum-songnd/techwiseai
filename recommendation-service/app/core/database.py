from contextlib import contextmanager
from typing import Generator

import psycopg
from pgvector.psycopg import register_vector
from psycopg import Connection

from app.core.config import get_settings


@contextmanager
def get_database_connection() -> Generator[Connection, None, None]:
    settings = get_settings()

    connection = psycopg.connect(
        settings.database_dsn,
        connect_timeout=10,
    )

    try:
        register_vector(connection)
        yield connection
    finally:
        connection.close()


def check_database_connection() -> dict:
    with get_database_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    current_database(),
                    (
                        SELECT extversion
                        FROM pg_extension
                        WHERE extname = 'vector'
                    ),
                    (
                        SELECT COUNT(*)
                        FROM products
                        WHERE embedding IS NOT NULL
                    )
                """
            )

            database_name, vector_version, embedding_count = cursor.fetchone()

    return {
        "database": database_name,
        "pgvectorVersion": vector_version,
        "productWithEmbeddingCount": embedding_count,
    }
