type JsonRecord = Record<string, unknown>;

const MATCH_EVENT_TYPES = new Set([
  "match_object_created",
  "match_status_aborted",
  "match_status_cancelled",
  "match_status_configuring",
  "match_status_finished",
  "match_status_ready",
]);

const MATCH_ID_KEYS = new Set(["match_id", "matchid"]);
const TEAM_ID_KEYS = new Set([
  "faction_id",
  "faceit_id",
  "premade_team_id",
  "team_id",
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecords(root: unknown): JsonRecord[] {
  const records: JsonRecord[] = [];
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const value = stack.pop();
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    if (!isRecord(value)) continue;

    records.push(value);
    stack.push(...Object.values(value));
  }

  return records;
}

function normalizeEventType(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase().replace(/[\s.-]+/g, "_");
  return MATCH_EVENT_TYPES.has(normalized) ? normalized : null;
}

export function getMatchEventType(body: unknown): string | null {
  for (const record of getRecords(body)) {
    for (const key of ["event", "event_type", "eventType", "type"]) {
      const eventType = normalizeEventType(record[key]);
      if (eventType) return eventType;
    }
  }

  return null;
}

function isUsableId(value: unknown): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 128;
}

export function getMatchId(body: unknown): string | null {
  const records = getRecords(body);

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (MATCH_ID_KEYS.has(key.toLowerCase()) && isUsableId(value)) {
        return value.trim();
      }
    }
  }

  for (const record of records) {
    if (isRecord(record.match) && isUsableId(record.match.id)) {
      return record.match.id.trim();
    }
    if (isRecord(record.match_data) && isUsableId(record.match_data.id)) {
      return record.match_data.id.trim();
    }
    for (const key of ["payload", "data"]) {
      const value = record[key];
      if (isRecord(value) && isUsableId(value.id)) return value.id.trim();
    }
  }

  return null;
}

export function getFaceitTeamIds(body: unknown): string[] {
  const teamIds = new Set<string>();

  const visit = (value: unknown, isTeamContainer = false) => {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, isTeamContainer);
      return;
    }
    if (!isRecord(value)) return;

    if (isTeamContainer && isUsableId(value.id)) {
      teamIds.add(value.id.trim());
    }

    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (TEAM_ID_KEYS.has(normalizedKey) && isUsableId(child)) {
        teamIds.add(child.trim());
      }

      visit(
        child,
        normalizedKey === "teams" || normalizedKey === "factions",
      );
    }
  };

  visit(body);

  return [...teamIds];
}

export function getWebhookEventId(body: unknown): string | null {
  const records = getRecords(body);

  for (const key of ["event_id", "eventid", "transaction_id"]) {
    for (const record of records) {
      for (const [recordKey, value] of Object.entries(record)) {
        if (recordKey.toLowerCase() === key && isUsableId(value)) {
          return value.trim();
        }
      }
    }
  }

  return null;
}

export function isCancelledMatchEvent(eventType: string): boolean {
  return eventType === "match_status_aborted" ||
    eventType === "match_status_cancelled";
}
