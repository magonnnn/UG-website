import {
  getFaceitTeamIds,
  getMatchEventType,
  getMatchId,
  getWebhookEventId,
  isCancelledMatchEvent,
} from "./helpers.ts";

Deno.test("reads FACEIT match event metadata", () => {
  const event = {
    transaction_id: "transaction-456",
    event: "match_status_finished",
    event_id: "event-123",
    payload: {
      id: "match-123",
      teams: [
        {
          id: "team-1",
          name: "Team One",
          roster: [{ id: "player-1" }],
        },
        { id: "team-2", name: "Team Two" },
      ],
    },
  };

  if (getMatchEventType(event) !== "match_status_finished") {
    throw new Error("Expected the match event type to be extracted");
  }
  if (getMatchId(event) !== "match-123") {
    throw new Error("Expected the match ID to be extracted");
  }
  if (getWebhookEventId(event) !== "event-123") {
    throw new Error("Expected the event ID to be extracted");
  }
  if (getFaceitTeamIds(event).sort().join(",") !== "team-1,team-2") {
    throw new Error("Expected both FACEIT team IDs to be extracted");
  }
});

Deno.test("recognizes cancellation events and ignores unrelated events", () => {
  if (
    getMatchEventType({ event: "tournament_status_started" }) !== null
  ) {
    throw new Error("Tournament events must not be treated as match events");
  }
  if (!isCancelledMatchEvent("match_status_cancelled")) {
    throw new Error("Cancelled match events should be identified");
  }
  if (isCancelledMatchEvent("match_status_finished")) {
    throw new Error("Finished events should not be treated as cancellations");
  }
});
