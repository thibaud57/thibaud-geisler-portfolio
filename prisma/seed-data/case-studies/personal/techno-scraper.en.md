## Context

Two of my tools need the same music metadata: tracks, artists, labels, release dates, BPM, key. A desktop application that re-tags my audio files, and a collection service for artists and labels.

The problem: no single platform covers the whole catalogue. So I query three of them, each for what it does best:

- **Beatport**: the most complete metadata, but a catalogue limited to distributed releases
- **Bandcamp**: self-released music and independent labels, which go through no distributor
- **SoundCloud**: artist and label profiles, and the only one of the three with an official OAuth API

So I built a **gateway**: it queries all three and always returns the same format, whichever one answered.

**My role**: design, development and operations, solo.

## Key achievements

### A single output contract across three sources

Whichever platform is queried, the routes return the same objects. Whoever consumes the API writes their logic once and switches source without rewriting anything.

**Technical challenges**: every source has its own structures and its own conventions. One puts remixers in dedicated fields, another settles for a free-text label name. Plus three pagination schemes that cannot be reconciled, one without a reliable total and one with no total at all.

**Solutions**: a shared pivot schema with one simple rule, nothing gets invented. A field the source does not provide comes back empty, never filled in by guesswork. Pagination goes through an **opaque cursor** the caller passes back as-is without reading it, which shields it from changes on the source side. And a clear convention: an empty list is not an error, which tells "this source has nothing" apart from "this source is broken".

### A block that happened at the TLS layer

Same IP address, same headers: a command-line call went through, while the same call from Python got refused. What set them apart was not the IP address but **the client's TLS signature**.

**Solutions**: I switched to an HTTP client whose signature looks like a browser's, applied once and for all to the session shared by every outbound call. I wrote down from the start what this technique does not do: it works at the transport layer, so it will not get past a JavaScript challenge. When an incident came up later, that note kept me from looking in the wrong place.

### A success response that returned an incomplete list

One route answered with a 200 status and a well-formed list, except part of the results were missing. The source page advertised a wrong item count: **5 announced for 355 actual, 1 for 736, 0 for 322**.

The caller had no way of noticing: no error, a valid response, just items missing from the roll call.

**Solutions**: fifteen combinations tested to find where the problem came from, then a move to another access channel, a properly paginated one this time. I dismissed the quick fix, reading a page whose counter is correct: it capped at 21 items, so it reduced the error instead of removing it.

### Removing a single point of failure

Every route of one source went through the same entry point. The day that host became unreachable, the whole source went down, while its data API was still answering.

**Solutions**: I removed that dependency rather than waiting for recovery. I also refused to keep the old path as a fallback: it relied on the same host, and a fallback nobody ever takes eventually stops working without anyone noticing.

### Staying within the official API quotas

The OAuth API caps how many tokens you can generate. Creating one per incoming request is enough to burn through the quota at the first traffic peak.

**Solutions**: a centralised token service, with in-memory cache, early renewal and de-duplication when several requests ask for one at the same time. A **circuit breaker** holds the failure for thirty seconds and answers without hitting the network again; past that delay, a single request makes a real attempt. One last detail that matters: a network cache can get a token's date wrong, so I rely on the expiry time returned by the server rather than on a "valid for one hour" style duration.

### Detecting the silent breakage of a scraper

The real risk with a scraper is not the loud crash but the mute failure: a source changes its structure, extraction breaks, and nobody sees it.

**Solutions**: errors go to **Sentry**, grouped on a key that includes the source and the status code returned. A broken source therefore raises one alert instead of several hundred. Data is scrubbed before sending and local-variable capture is turned off, otherwise the configuration ends up in the traces with an API key in clear text. Finally, a request identifier follows the whole path, from the alert to its matching log line.

## Results

- Three platforms behind **a single output format**
- A route returning incomplete lists spotted and fixed: **up to 736 missing items on a single request**
- An alert as soon as a source changes structure, instead of extraction breaking in silence
- Tests with **no real network calls at all**, on frozen responses
- Strict typing and blocking lint in CI, automated versioning and changelog
- **Zero cost**: the VPS was already there, no paid service added

## Takeaways

- Diagnosing a block that happens at the TLS signature level, and knowing the exact limit of the workaround
- Designing an API contract shared across sources: normalisation, opaque cursor, explicit error semantics
- Managing OAuth tokens under quota: caching, concurrency, circuit breaker, reliable expiry
- Making a service observable when its main failure mode is silent
- A success response returning an incomplete list costs more than an outright outage: an outage is visible and gets handled, a truncated list reaches the caller who takes it at face value
- Writing down a tool's limits when you pick it saves a huge amount of time the day it breaks

## Planned evolutions

- Adding a Discogs provider
- Adding a Beatstats provider
- Connecting the gateway and the artist and label collection service over the VPS internal network

## Links

Source code available on request (not public by strategic choice).
