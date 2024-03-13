import pool from '../db';

export interface Author {
    username: string;
}

export interface Cast {
    hash: string;
    parentHash: string | null;
    author: Author;
    text: string;
    timestamp: string;
}

export async function getExistingSummary(threadHash: string, length: string) {
    const query = 'SELECT openai_response FROM thread_summary WHERE hash = $1 AND length = $2';
    const { rows } = await pool.query(query, [threadHash, length]);
    return rows[0];
}

export async function saveSummaryToDB(threadHash: string, length: string, summary: string) {
    const query = 'INSERT INTO thread_summary (hash, length, openai_response) VALUES ($1, $2, $3)';
    await pool.query(query, [threadHash, length, summary]);
}

export async function updateSummaryInDB(threadHash: string, length: string, summary: string) {
    const query = 'UPDATE thread_summary SET openai_response = $3, last_update = CURRENT_TIMESTAMP WHERE hash = $1 AND length = $2';
    await pool.query(query, [threadHash, length, summary]);
}
