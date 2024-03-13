import axios from 'axios';
import { Cast } from '../models/threadSummaryModel';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const NEYNAR_API_KEY = process.env.NEYNAR_API;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function fetchThreadData(threadHash: string) {
    const response = await axios.get('https://api.neynar.com/v1/farcaster/all-casts-in-thread', {
        params: { threadHash },
        headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
    });
    return response.data;
}

export function formatThreads(casts: Cast[]): string[] {
    const castMap = new Map<string, Cast>(casts.map(cast => [cast.hash, cast]));
    const sortedCasts = casts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return sortedCasts.map(cast => buildChain(cast.hash, castMap)).filter(chain => chain !== '');
}

export function buildChain(hash: string, castMap: Map<string, Cast>): string {
    const cast = castMap.get(hash);
    if (!cast) return '';
    const currentText = `[@${cast.author.username}]: ${cast.text}`;
    if (!cast.parentHash) {
        return currentText;
    } else {
        const parentChain = buildChain(cast.parentHash, castMap);
        return `${parentChain}; ${currentText}`;
    }
}

export async function getThreadSummary(threadData: string[], length: string): Promise<string> {
    let summaryLength = 'short (100 word)';
    if (length === '1') {
        summaryLength = 'medium (200 word)';
    } else if (length === '2') {
        summaryLength = 'long (300 word)';
    }
    const prompt = `Your job is to summarize this entire thing ${threadData.join('\n')} laconically mentioning important strains of the conversation and factions of users. Please target a ${summaryLength} summary.`;
    const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
    });
    return chatCompletion.choices[0].message.content || 'No summary generated';
}
