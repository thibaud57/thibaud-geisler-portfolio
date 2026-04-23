## Context

While planning a multi-destination trip (South America), I realized that flight comparators (Google Flights, Kayak) **don't support dynamic date ranges in multi-city mode**.

Concretely: for a **Paris → Rio → Buenos Aires → Paris** trip with flexible dates (departure between June 1st and 15th, then Rio → Buenos Aires between June 20th and 30th), **impossible** with these comparators. I have to enter a fixed date for each flight.

With 3-4-5 flights and flexible date windows, that adds up to **hundreds of combinations to test manually**. Only Kiwi offers this feature, but its prices are systematically higher.

**Goal**: build a bot that automatically tests all possible date combinations for a multi-city trip and extracts the **top 10 cheapest prices**.

**My role**: end-to-end design, development and deployment, autonomously.

## Key achievements

### Google Flights scraping

Crawling Google Flights pages to extract flight prices via CSS selectors.

**Technical challenges**: Google's anti-bot detection, complex and dynamic HTML structure, captcha handling.

**Solutions**: stealth browser with realistic Chrome headers, French-IP residential proxies, retry logic with exponential backoff plus proxy rotation on captcha detection.

### Pivot to Kayak (the real challenge)

After Google Flights, added Kayak to compare prices across sources (Kayak aggregates 50+ carriers).

**Technical challenges**: **Kayak extremely aggressive anti-bot**, all my initial attempts failed (basic stealth, residential proxies, standard techniques). Advanced fingerprinting detecting automation.

**Solutions**: **pivot to a browser with advanced anti-fingerprinting**, network capture of internal API requests, JSON parsing instead of HTML.

### Multi-city combination generation

Generating all possible date combinations for each trip leg.

**Technical challenges**: combinatorial explosion (e.g. 3 legs × 15 days each = thousands of requests), prohibitive crawl time if testing everything.

**Solutions**: algorithmic optimization and controlled parallelism to reduce crawl time while avoiding blocks.

## Results

- **200 combinations tested in 5 min** (Google Flights), 10 min (Kayak)
- **€100-200 savings** found vs random combinations
- **Operating cost**: ~$10 per 1500 requests (Google), ~$20 (Kayak)
- Price tracking possible via cron to monitor trends

## Takeaways

- Advanced scraping and anti-detection (stealth browsers, anti-fingerprinting)
- Handling advanced browser fingerprinting
- Async Python architecture (FastAPI, asyncio)
- Rigorous TDD (317 tests, 90% coverage)
- Technical documentation via ADRs
- Don't underestimate modern anti-bot protections, always have a plan B (and C)

## Planned evolutions

- Opening up to other search types (not only multi-city)
- Setting up an MCP
- Web UI to visualize results
- Price alerts (webhook when a price drops)

## Links

Source code available on request (not public by strategic choice).
