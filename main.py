import requests
import pandas as pd
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('.env')

NEYNAR_API_KEY = os.getenv("NEYNAR_API")


def fetch_thread_data(thread_hash):
    """
    Fetches thread data for a given thread hash using the Neynar API.
    """
    response = requests.get(
        'https://api.neynar.com/v1/farcaster/all-casts-in-thread',
        params={'threadHash': thread_hash},
        headers={'accept': 'application/json', 'api_key': NEYNAR_API_KEY}
    )
    response.raise_for_status()
    return response.json()

def format_threads(casts):
    """
    Formats each cast in the thread by building a conversation chain.
    """
    cast_df = pd.DataFrame(casts)
    cast_df.set_index('hash', inplace=True)
    cast_df['timestamp'] = pd.to_datetime(cast_df['timestamp'])
    cast_df.sort_values(by='timestamp', inplace=True)

    formatted_chains = [build_chain(hash, cast_df) for hash in cast_df.index]
    return formatted_chains

def build_chain(hash, cast_df):
    """
    Recursively builds the conversation chain for a given cast.
    """
    if hash not in cast_df.index:
        return ''

    current_cast = cast_df.loc[hash]
    current_text = f"[@{current_cast['author']['username']}]: {current_cast['text']}"

    if pd.isna(current_cast['parentHash']):
        return current_text
    else:
        parent_chain = build_chain(current_cast['parentHash'], cast_df)
        return f"{parent_chain}; {current_text}"

# Example usage:
thread_hash = "0x40b1313724c4e4f5449c74fb4995593576dc1ff8"
thread_data = fetch_thread_data(thread_hash)
formatted_threads = format_threads(thread_data['result']['casts'])
for thread in formatted_threads:
    print(thread)
