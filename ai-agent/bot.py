#!/usr/bin/env python3
"""
GoalSwap Arena — @GoalSwapAgent X (Twitter) Bot

Auto-posts match updates every 15 minutes during live games,
replies to @mentions with AI-powered analysis, and enforces
hashtag/tag strategy for the hackathon.

Stack: Tweepy v2 + OpenAI GPT-4o-mini + manual scheduler loop
"""

import os
import sys
import json
import time
import logging
import threading
from datetime import datetime, timezone
from typing import Any

import tweepy
import requests
from dotenv import load_dotenv
from openai import OpenAI

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("GoalSwapAgent")

load_dotenv()

# ── Constants ──
REQUIRED_TAGS = "@XLayerOfficial @Uniswap @flapdotsh"
HASHTAGS = "#WorldCup2026 #GoalSwap #XLayer #UniswapV4"
BOT_USERNAME = os.getenv("BOT_USERNAME", "GoalSwapAgent").lstrip("@")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://goalswap.xyz")
ORACLE_API_URL = os.getenv("ORACLE_API_URL", "http://localhost:3002")
POST_INTERVAL = int(os.getenv("POST_INTERVAL_MINUTES", "15"))
ONLY_DURING_LIVE = os.getenv("ONLY_POST_DURING_LIVE", "true").lower() == "true"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# ── Clients ──
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

tweepy_client = tweepy.Client(
    consumer_key=os.getenv("X_API_KEY"),
    consumer_secret=os.getenv("X_API_SECRET"),
    access_token=os.getenv("X_ACCESS_TOKEN"),
    access_token_secret=os.getenv("X_ACCESS_TOKEN_SECRET"),
    bearer_token=os.getenv("X_BEARER_TOKEN"),
    wait_on_rate_limit=True,
)

# ── Oracle API ──


def fetch_json(path: str) -> dict | list | None:
    """Fetch JSON from the oracle REST API."""
    try:
        resp = requests.get(
            f"{ORACLE_API_URL}{path}",
            timeout=10,
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code == 200:
            return resp.json()
        logger.warning("Oracle API %s returned %s", path, resp.status_code)
        return None
    except requests.RequestException as e:
        logger.error("Oracle API request failed: %s", e)
        return None


def get_live_matches() -> list[dict[str, Any]]:
    """Fetch currently live matches from the oracle."""
    data = fetch_json("/api/matches?status=live")
    if isinstance(data, dict):
        return data.get("matches", [])
    return []


def get_leaderboard() -> list[dict[str, Any]]:
    """Fetch top traders."""
    data = fetch_json("/api/leaderboard/volume")
    if isinstance(data, dict):
        return data.get("entries", [])
    return []


# ── Post Content Generation ──


def format_match_post(match: dict[str, Any]) -> str:
    """Format a match update post with score, fee, and trade link."""
    match_id = match.get("matchId", "?")
    home = match.get("homeTeam", "Home")
    away = match.get("awayTeam", "Away")
    home_score = match.get("homeScore", 0)
    away_score = match.get("awayScore", 0)
    minute = match.get("minute", 0)
    status = match.get("status", "NS")
    fee_tier = match.get("feeTier", 100)

    if status == "FT":
        status_str = "FT"
    elif status == "LIV":
        status_str = f"{minute}'"
    else:
        status_str = "Upcoming"

    fee_pct = fee_tier / 100
    trade_link = f"{FRONTEND_URL}/match/{match_id}"
    scoreline = f"{home} {home_score}–{away_score} {away}"

    return (
        f"{scoreline} ({status_str})\n\n"
        f"📊 Fee: {fee_pct:.1f}% | Trade: {trade_link}\n\n"
        f"{REQUIRED_TAGS}\n{HASHTAGS}"
    )


def generate_match_insight(match: dict[str, Any]) -> str | None:
    """Use OpenAI to generate a brief match insight for the post."""
    try:
        home = match.get("homeTeam", "Home")
        away = match.get("awayTeam", "Away")
        home_score = match.get("homeScore", 0)
        away_score = match.get("awayScore", 0)
        minute = match.get("minute", 0)
        fee_tier = match.get("feeTier", 100)

        prompt = (
            f"Write a short, engaging sentence (max 200 chars) about this World Cup 2026 match:\n"
            f"{home} {home_score}-{away_score} {away} at {minute}'.\n"
            f"Trading fee is {fee_tier/100}%. "
            f"Make it sound like a sports commentator who also talks markets. "
            f"Use emojis. No hashtags. No tags."
        )

        resp = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are the voice of GoalSwap Arena — a World Cup 2026 prediction market. "
                    "You sound energetic, knowledgeable, and slightly cheeky. "
                    "Responses must be under 200 characters.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=80,
            temperature=0.8,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("OpenAI insight generation failed: %s", e)
        return None


def build_auto_post(match: dict[str, Any]) -> str | None:
    """Build a full auto-post with AI insight + match data."""
    insight = generate_match_insight(match)
    match_id = match.get("matchId", "?")
    home = match.get("homeTeam", "Home")
    away = match.get("awayTeam", "Away")
    home_score = match.get("homeScore", 0)
    away_score = match.get("awayScore", 0)
    minute = match.get("minute", 0)
    status = match.get("status", "NS")

    if status == "LIV":
        status_str = f"{minute}'"
    elif status == "FT":
        status_str = "FT"
    else:
        return None  # Don't auto-post for non-live matches

    trade_link = f"{FRONTEND_URL}/match/{match_id}"

    lines = []
    if insight:
        lines.append(insight)
        lines.append("")
    lines.append(f"{home} {home_score}–{away_score} {away} ({status_str})")
    lines.append(f"📊 Trade: {trade_link}")
    lines.append("")
    lines.append(REQUIRED_TAGS)
    lines.append(HASHTAGS)

    return "\n".join(lines)


def build_reply(question: str, match: dict[str, Any] | None) -> str:
    """Generate an AI reply to a user @mention."""
    context = ""
    if match:
        context = (
            f"Current match: {match.get('homeTeam', '?')} {match.get('homeScore', '?')}"
            f"-{match.get('awayScore', '?')} {match.get('awayTeam', '?')} "
            f"at {match.get('minute', '?')}'. "
            f"Fee: {match.get('feeTier', 100) / 100}%. "
        )

    try:
        resp = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are @GoalSwapAgent, the AI assistant for GoalSwap Arena — "
                        "a World Cup 2026 prediction market on X Layer with Uniswap V4. "
                        "Answer questions about matches, trading, fees, and the platform. "
                        f"{context}"
                        "Be concise (max 280 chars). Use emojis. "
                        "If asked for a trade link, include it."
                        f"Include these tags: {REQUIRED_TAGS}"
                        f"Hashtags: {HASHTAGS}"
                    ),
                },
                {"role": "user", "content": question},
            ],
            max_tokens=120,
            temperature=0.7,
        )
        reply = resp.choices[0].message.content.strip()
        # Ensure required tags are appended if not present
        if REQUIRED_TAGS not in reply:
            reply = reply + "\n\n" + REQUIRED_TAGS
        if HASHTAGS not in reply:
            reply = reply + "\n" + HASHTAGS
        return reply
    except Exception as e:
        logger.error("OpenAI reply generation failed: %s", e)
        return (
            f"⚽ Check out {FRONTEND_URL}/matches for live scores and trading. "
            f"{REQUIRED_TAGS} {HASHTAGS}"
        )


# ── Posting Logic ──


def post_tweet(text: str) -> str | None:
    """Post a tweet, return the tweet ID if successful."""
    if not text or len(text.strip()) == 0:
        logger.warning("Empty tweet — skipping")
        return None

    try:
        resp = tweepy_client.create_tweet(text=text)
        if resp.data:
            tweet_id = resp.data["id"]
            logger.info("Posted tweet: %s", tweet_id)
            return tweet_id
        logger.error("Tweet creation returned no data: %s", resp)
        return None
    except tweepy.TweepyException as e:
        logger.error("Failed to post tweet: %s", e)
        return None


def auto_post_job(matches: list[dict[str, Any]]):
    """Post updates for the given list of live matches."""
    if not matches:
        logger.info("No live matches — skipping auto-post")
        return

    logger.info("Running auto-post for %d matches...", len(matches))
    for match in matches[:3]:  # Max 3 posts per cycle to avoid spam
        post = build_auto_post(match)
        if post:
            post_tweet(post)
            time.sleep(10)  # Space out posts


# ── Reply Handler ──


def handle_mention(mention: dict[str, Any]):
    """Process an @mention and reply with AI-generated content."""
    tweet_id = mention.get("id")
    author_id = mention.get("author_id")
    text = mention.get("text", "")

    if not tweet_id or not author_id:
        return

    logger.info("Handling mention from %s: %s", author_id, text[:80])

    # Remove the bot username from the text
    clean_text = text.replace(f"@{BOT_USERNAME}", "").replace(f"@{BOT_USERNAME.lower()}", "").strip()

    # Try to find a mentioned match in the text
    mentioned_match = None
    matches = get_live_matches()
    for match in matches:
        team_lower = match.get("homeTeam", "").lower()
        away_lower = match.get("awayTeam", "").lower()
        query_lower = clean_text.lower()
        if team_lower in query_lower or away_lower in query_lower:
            mentioned_match = match
            break

    reply = build_reply(clean_text, mentioned_match)

    try:
        resp = tweepy_client.create_tweet(
            text=reply,
            in_reply_to_tweet_id=tweet_id,
        )
        if resp.data:
            logger.info("Replied to mention %s with tweet %s", tweet_id, resp.data["id"])
    except tweepy.TweepyException as e:
        logger.error("Failed to reply to mention %s: %s", tweet_id, e)


def poll_mentions(last_mention_id: int = 0) -> int:
    """Poll for new @mentions and handle them. Returns the latest mention ID."""
    try:
        # Get the bot user's ID
        me = tweepy_client.get_me()
        if not me.data:
            logger.error("Could not get bot user ID")
            return last_mention_id

        bot_id = me.data.id

        # Fetch recent mentions
        mentions = tweepy_client.get_users_mentions(
            id=bot_id,
            since_id=last_mention_id if last_mention_id > 0 else None,
            tweet_fields=["author_id", "created_at"],
            max_results=10,
        )

        if not mentions.data:
            return last_mention_id

        new_last_id = last_mention_id
        for mention in mentions.data:
            mention_data = {"id": mention.id, "author_id": mention.author_id, "text": mention.text}
            handle_mention(mention_data)
            if mention.id > new_last_id:
                new_last_id = mention.id

        return new_last_id if new_last_id > last_mention_id else last_mention_id

    except tweepy.TweepyException as e:
        logger.error("Failed to poll mentions: %s", e)
        return last_mention_id


# ── Scheduler Loop ──


def scheduler_loop():
    """Simple scheduler loop that runs auto-post on interval and polls mentions."""
    last_mention_id = 0
    last_post_time = 0

    logger.info("Scheduler started (interval: %s min, live-only: %s)", POST_INTERVAL, ONLY_DURING_LIVE)

    while True:
        now = time.time()

        # Auto-posting
        if now - last_post_time >= POST_INTERVAL * 60:
            matches = get_live_matches()
            if not matches and ONLY_DURING_LIVE:
                logger.debug("No live matches — skipping post cycle")
            else:
                auto_post_job(matches)
                last_post_time = now

        # Mention polling (every 30 seconds)
        last_mention_id = poll_mentions(last_mention_id)

        time.sleep(30)


# ── Main ──


def validate_env():
    """Check that required env vars are set."""
    # X API credentials are strictly required
    required = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"]
    missing = [v for v in required if not os.getenv(v)]
    if missing:
        logger.error("Missing required env vars: %s", ", ".join(missing))
        logger.error("Copy .env.example to .env and fill in your credentials")
        return False
    # OpenAI key is optional (fallback responses used if missing)
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not set — AI replies will use fallback text")
    return True


def main():
    """Entry point: validate config, start scheduler."""
    logger.info("=" * 50)
    logger.info("GoalSwap Agent — @%s", BOT_USERNAME)
    logger.info("Model: %s", OPENAI_MODEL)
    logger.info("Post interval: %s min", POST_INTERVAL)
    logger.info("Live-only: %s", ONLY_DURING_LIVE)
    logger.info("Oracle API: %s", ORACLE_API_URL)
    logger.info("Frontend: %s", FRONTEND_URL)
    logger.info("=" * 50)

    if not validate_env():
        sys.exit(1)

    # Verify X API connectivity
    try:
        me = tweepy_client.get_me()
        if me.data:
            logger.info("Authenticated as @%s (ID: %s)", me.data.username, me.data.id)
        else:
            logger.error("X API authentication failed — could not get user info")
            sys.exit(1)
    except tweepy.TweepyException as e:
        logger.error("X API authentication error: %s", e)
        sys.exit(1)

    logger.info("Starting scheduler...")
    scheduler_loop()


if __name__ == "__main__":
    main()
